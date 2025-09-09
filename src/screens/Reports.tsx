import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

/** Helper: simple tag parser for existing note strings.
 *  Looks for `Label: value` inside the note (case-insensitive).
 */
function pickFromNote(note: string | undefined, label: string): string {
  if (!note) return "";
  // examples it will match: "WO: 44", "Work Order: 44", "Dept: TANKING", "Employee: John"
  const rx = new RegExp(`(?:^|[|])\\s*${label}\\s*:\\s*([^|]+)`, "i");
  const m = note.match(rx);
  return m ? m[1].trim() : "";
}

// CSV helpers
function toCSV(rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          const needsQuote = /[",\n]/.test(s);
          const safe = s.replace(/"/g, '""');
          return needsQuote ? `"${safe}"` : safe;
        })
        .join(",")
    )
    .join("\n");
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

type Mode =
  | "outward-all"
  | "site-issued"
  | "factory-issued"
  | "inward"; // NEW: add Inward option in the same screen

export default function Reports() {
  const { state } = useInventory();

  // paging
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // filters
  const [mode, setMode] = useState<Mode>("outward-all");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");
  const [fromDate, setFromDate] = useState<string>(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>("");

  // collect movements joined with item
  const rows = useMemo(() => {
    const itemsById = new Map(state.items.map((i) => [i.id, i]));
    // enrich movements
    return state.movements
      .map((m) => {
        const item = itemsById.get(m.itemId || (m as any).item?.id || "");
        return { m, item };
      })
      .filter(({ item }) => !!item);
  }, [state.items, state.movements]);

  // computed labor list (for Site filter)
  const allLabors = useMemo(() => {
    const set = new Set<string>();
    for (const { m } of rows) {
      if (m.type !== "OUTWARD") continue;
      const labor =
        (m as any).meta?.labor ||
        pickFromNote(m.note, "Labor");
      if (labor) set.add(labor);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // mode-specific filtering + date range
  const filtered = useMemo(() => {
    const start = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const end = toDate ? new Date(toDate + "T23:59:59").getTime() : Infinity;

    return rows.filter(({ m }) => {
      const t = new Date(m.date).getTime();
      if (t < start || t > end) return false;

      if (mode === "inward") return m.type === "INWARD";

      if (mode === "outward-all") return m.type === "OUTWARD";

      if (mode === "site-issued") {
        if (m.type !== "OUTWARD") return false;

        // identify as SITE by presence of site fields (meta preferred) or "Site Issue" in note
        const site =
          (m as any).meta?.toSite ||
          pickFromNote(m.note, "Given To") ||
          pickFromNote(m.note, "Site");
        if (!site) return false;

        if (laborFilter !== "__ALL__") {
          const labor =
            (m as any).meta?.labor ||
            pickFromNote(m.note, "Labor");
          if (labor !== laborFilter) return false;
        }
        return true;
      }

      if (mode === "factory-issued") {
        if (m.type !== "OUTWARD") return false;

        // identify as FACTORY by presence of department meta or "Factory Issue" in note
        const dept =
          (m as any).meta?.department || pickFromNote(m.note, "Dept") || pickFromNote(m.note, "Department");
        const siteHint =
          (m as any).meta?.toSite || pickFromNote(m.note, "Given To") || pickFromNote(m.note, "Site");
        if (dept && !siteHint) return true; // clear factory case
        // also allow explicit "Factory Issue" in note
        if (/factory\s*issue/i.test(m.note || "")) return true;
        return false;
      }

      return true;
    });
  }, [rows, mode, laborFilter, fromDate, toDate]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // export handlers (mode-aware)
  function exportCSV() {
    if (mode === "inward") {
      const header = ["Date", "Item", "Unit", "Qty", "Purchaser", "Bill No.", "Bill Date", "Price per Unit"];
      const data = filtered.map(({ m, item }) => {
        // inward meta fields were stored on movement.meta (or parse note fallback)
        const meta = (m as any).meta || {};
        const purchaser = meta.purchaser || pickFromNote(m.note, "Purchaser");
        const billNo = meta.billNo || pickFromNote(m.note, "Bill");
        const billDate = meta.billDate || pickFromNote(m.note, "Bill Date");
        const price = meta.pricePerUnit ?? pickFromNote(m.note, "Price");
        return [
          new Date(m.date).toLocaleDateString(),
          item!.name,
          item!.unit,
          m.quantity,
          purchaser || "",
          billNo || "",
          billDate || "",
          price || "",
        ];
      });
      const blob = toCSV([header, ...data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inward.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (mode === "outward-all") {
      const header = ["Date", "Item", "Unit", "Qty", "Type / Note"];
      const data = filtered.map(({ m, item }) => [
        new Date(m.date).toLocaleDateString(),
        item!.name,
        item!.unit,
        m.quantity,
        m.note || (m as any).meta?.type || "OUTWARD",
      ]);
      const blob = toCSV([header, ...data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "outward_all.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (mode === "site-issued") {
      const header = ["Date", "Item", "Unit", "Qty", "To / Site", "Labor", "Work Order", "Scheme"];
      const data = filtered.map(({ m, item }) => {
        const meta = (m as any).meta || {};
        const site = meta.toSite || pickFromNote(m.note, "Given To") || pickFromNote(m.note, "Site");
        const labor = meta.labor || pickFromNote(m.note, "Labor");
        const wo = meta.workOrder || pickFromNote(m.note, "WO") || pickFromNote(m.note, "Work Order");
        const scheme = meta.scheme || pickFromNote(m.note, "Scheme");
        return [
          new Date(m.date).toLocaleDateString(),
          item!.name,
          item!.unit,
          m.quantity,
          site || "",
          labor || "",
          wo || "",
          scheme || "",
        ];
      });
      const blob = toCSV([header, ...data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "site_material_issued.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (mode === "factory-issued") {
      const header = ["Date", "Item", "Unit", "Qty", "Department", "Issue To Employee"];
      const data = filtered.map(({ m, item }) => {
        const meta = (m as any).meta || {};
        const dept = meta.department || pickFromNote(m.note, "Dept") || pickFromNote(m.note, "Department");
        const emp = meta.employee || pickFromNote(m.note, "Employee") || pickFromNote(m.note, "Issue To");
        return [
          new Date(m.date).toLocaleDateString(),
          item!.name,
          item!.unit,
          m.quantity,
          dept || "",
          emp || "",
        ];
      });
      const blob = toCSV([header, ...data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "factory_material_issued.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
  }

  // table header renderer based on mode
  function HeaderRow() {
    if (mode === "inward") {
      return (
        <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
          <div className="col-span-2">DATE</div>
          <div className="col-span-3">ITEM NAME</div>
          <div className="col-span-1">UNIT</div>
          <div className="col-span-1">QTY</div>
          <div className="col-span-2">PURCHASER</div>
          <div className="col-span-1">BILL NO.</div>
          <div className="col-span-2">BILL DATE</div>
        </div>
      );
    }

    if (mode === "outward-all") {
      return (
        <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
          <div className="col-span-2">DATE</div>
          <div className="col-span-3">ITEM NAME</div>
          <div className="col-span-1">UNIT</div>
          <div className="col-span-1">QTY</div>
          <div className="col-span-5">TYPE / NOTE</div>
        </div>
      );
    }

    if (mode === "site-issued") {
      return (
        <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
          <div className="col-span-2">DATE</div>
          <div className="col-span-3">ITEM NAME</div>
          <div className="col-span-1">UNIT</div>
          <div className="col-span-1">QTY</div>
          <div className="col-span-2">TO / SITE</div>
          <div className="col-span-1">LABOR</div>
          <div className="col-span-1">WORK ORDER</div>
          <div className="col-span-1">SCHEME</div>
        </div>
      );
    }

    // factory
    return (
      <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
        <div className="col-span-2">DATE</div>
        <div className="col-span-3">ITEM NAME</div>
        <div className="col-span-1">UNIT</div>
        <div className="col-span-1">QTY</div>
        <div className="col-span-3">DEPARTMENT</div>
        <div className="col-span-2">ISSUE TO EMPLOYEE</div>
      </div>
    );
  }

  function Row({ idx }: { idx: number }) {
    const { m, item } = pageRows[idx];
    const date = new Date(m.date).toLocaleDateString();
    const meta = (m as any).meta || {};

    if (mode === "inward") {
      const purchaser = meta.purchaser || pickFromNote(m.note, "Purchaser");
      const billNo = meta.billNo || pickFromNote(m.note, "Bill");
      const billDate = meta.billDate || pickFromNote(m.note, "Bill Date");
      return (
        <div className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
          <div className="col-span-2">{date}</div>
          <div className="col-span-3 truncate font-medium">{item!.name}</div>
          <div className="col-span-1">{item!.unit}</div>
          <div className="col-span-1">{m.quantity}</div>
          <div className="col-span-2 truncate">{purchaser || "—"}</div>
          <div className="col-span-1 truncate">{billNo || "—"}</div>
          <div className="col-span-2">{billDate || "—"}</div>
        </div>
      );
    }

    if (mode === "outward-all") {
      return (
        <div className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
          <div className="col-span-2">{date}</div>
          <div className="col-span-3 truncate font-medium">{item!.name}</div>
          <div className="col-span-1">{item!.unit}</div>
          <div className="col-span-1">{m.quantity}</div>
          <div className="col-span-5 truncate">{m.note || (meta.type ?? "OUTWARD")}</div>
        </div>
      );
    }

    if (mode === "site-issued") {
      const site = meta.toSite || pickFromNote(m.note, "Given To") || pickFromNote(m.note, "Site");
      const labor = meta.labor || pickFromNote(m.note, "Labor");
      const wo = meta.workOrder || pickFromNote(m.note, "WO") || pickFromNote(m.note, "Work Order");
      const scheme = meta.scheme || pickFromNote(m.note, "Scheme");
      return (
        <div className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
          <div className="col-span-2">{date}</div>
          <div className="col-span-3 truncate font-medium">{item!.name}</div>
          <div className="col-span-1">{item!.unit}</div>
          <div className="col-span-1">{m.quantity}</div>
          <div className="col-span-2 truncate">{site || "—"}</div>
          <div className="col-span-1 truncate">{labor || "—"}</div>
          <div className="col-span-1 truncate">{wo || "—"}</div>
          <div className="col-span-1 truncate">{scheme || "—"}</div>
        </div>
      );
    }

    // factory
    const dept = meta.department || pickFromNote(m.note, "Dept") || pickFromNote(m.note, "Department");
    const emp = meta.employee || pickFromNote(m.note, "Employee") || pickFromNote(m.note, "Issue To");
    return (
      <div className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
        <div className="col-span-2">{date}</div>
        <div className="col-span-3 truncate font-medium">{item!.name}</div>
        <div className="col-span-1">{item!.unit}</div>
        <div className="col-span-1">{m.quantity}</div>
        <div className="col-span-3 truncate">{dept || "—"}</div>
        <div className="col-span-2 truncate">{emp || "—"}</div>
      </div>
    );
  }

  // mode label
  const modeLabel: Record<Mode, string> = {
    "outward-all": "Outward (All)",
    "site-issued": "Site Material Issued",
    "factory-issued": "Factory Material Issued",
    inward: "Inward",
  };

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as Mode);
                setPage(1);
              }}
            >
              <option value="outward-all">{modeLabel["outward-all"]}</option>
              <option value="site-issued">{modeLabel["site-issued"]}</option>
              <option value="factory-issued">{modeLabel["factory-issued"]}</option>
              <option value="inward">{modeLabel["inward"]}</option>
            </select>

            {/* Labor filter: visible only for site-issued */}
            {mode === "site-issued" && (
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={laborFilter}
                onChange={(e) => {
                  setLaborFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="__ALL__">All Labors</option>
                {allLabors.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            )}

            {/* Date range */}
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Export
              </button>
            </div>
          </div>

          {/* Header */}
          <HeaderRow />

          {/* Body */}
          {pageRows.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">No entries.</div>
          ) : (
            <div className="divide-y">
              {pageRows.map((_, i) => (
                <Row key={i} idx={i} />
              ))}
            </div>
          )}

          {/* Pager */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div>
                Page {page} / {totalPages}
              </div>
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
