import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

/** Modes available in the dropdown */
type Mode = "INWARD" | "ALL" | "SITE" | "FACTORY";

/** Outward parsing result */
type ParsedOutward =
  | {
      kind: "SITE";
      toSite?: string;
      labor?: string;
      workOrder?: string;
      scheme?: string;
    }
  | {
      kind: "FACTORY";
      department?: string;
      employee?: string;
    }
  | { kind: "UNKNOWN" };

/** Inward parsing result */
type ParsedInward = {
  purchaser?: string;
  billNo?: string;
  billDate?: string;
  pricePerUnit?: number;
};

/* ------------------------- helpers ------------------------- */

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function valAfter(note: string, label: string) {
  const n = note.toLowerCase();
  const i = n.indexOf(label.toLowerCase());
  if (i === -1) return undefined;
  const raw = note.slice(i + label.length).trim();
  const j = raw.indexOf("|");
  const v = (j === -1 ? raw : raw.slice(0, j)).trim();
  return v || undefined;
}

/** Parse outward note text to decide Site vs Factory and pull fields */
function parseOutwardNote(note?: string): ParsedOutward {
  if (!note) return { kind: "UNKNOWN" };
  const n = note.toLowerCase();

  if (n.includes("site issue") || n.includes("given to:")) {
    return {
      kind: "SITE",
      toSite: valAfter(note, "Given To:"),
      labor: valAfter(note, "Labor:"),
      workOrder: valAfter(note, "WO:"),
      scheme: valAfter(note, "Scheme:"),
    };
  }
  if (n.includes("factory issue") || n.includes("dept:")) {
    return {
      kind: "FACTORY",
      department: valAfter(note, "Dept:"),
      employee: valAfter(note, "Employee:"),
    };
  }
  return { kind: "UNKNOWN" };
}

/** Parse inward note text to pull purchaser/bill/price when meta not present */
function parseInwardNote(note?: string): ParsedInward {
  if (!note) return {};
  const purchaser = valAfter(note, "Purchaser:") || valAfter(note, "Buyer:");
  const billNo = valAfter(note, "Bill:") || valAfter(note, "Bill No:");
  const billDate = valAfter(note, "Bill Date:") || valAfter(note, "BDate:");
  const priceStr = valAfter(note, "Price:") || valAfter(note, "Price/Unit:") || valAfter(note, "Rate:");
  const pricePerUnit = priceStr ? Number(priceStr.replace(/[^0-9.]+/g, "")) : undefined;
  return { purchaser, billNo, billDate, pricePerUnit };
}

/** Simple client-side pagination */
function usePaging<T>(rows: T[], pageSize = 15) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);
  return {
    page,
    pageCount,
    current,
    total: rows.length,
    next: () => setPage((p) => Math.min(p + 1, pageCount)),
    prev: () => setPage((p) => Math.max(p - 1, 1)),
    reset: () => setPage(1),
  };
}

/* ------------------------- component ------------------------- */

export default function Reports() {
  const { state } = useInventory();

  const [mode, setMode] = useState<Mode>("INWARD");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");

  /* ---- build INWARD rows ---- */
  const inwardRows = useMemo(() => {
    const rows: Array<{
      date: string; // movement date (inward date)
      itemName: string;
      unit: string;
      qty: number;
      purchaser?: string;
      billNo?: string;
      billDate?: string;
      pricePerUnit?: number;
    }> = [];

    state.items.forEach((item) => {
      (item.history || []).forEach((m: any) => {
        if (m.type !== "INWARD") return;
        const fromMeta: ParsedInward = {
          purchaser: m.meta?.purchaser,
          billNo: m.meta?.billNo,
          billDate: m.meta?.billDate,
          pricePerUnit: m.meta?.pricePerUnit,
        };
        const fromNote = parseInwardNote(m.note);
        rows.push({
          date: m.date || "",
          itemName: item.name,
          unit: item.unit,
          qty: Number(m.quantity || 0),
          purchaser: fromMeta.purchaser ?? fromNote.purchaser,
          billNo: fromMeta.billNo ?? fromNote.billNo,
          billDate: fromMeta.billDate ?? fromNote.billDate,
          pricePerUnit:
            fromMeta.pricePerUnit ?? fromNote.pricePerUnit ?? (typeof item.purchasePrice === "number" ? item.purchasePrice : undefined),
        });
      });
    });

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [state.items]);

  /* ---- build OUTWARD rows (and classify) ---- */
  const outwardRows = useMemo(() => {
    const rows: Array<{
      date: string;
      itemName: string;
      unit: string;
      qty: number;
      note?: string;
      parsed: ParsedOutward;
    }> = [];

    state.items.forEach((item) => {
      (item.history || []).forEach((m: any) => {
        if (m.type !== "OUTWARD") return;
        rows.push({
          date: m.date || "",
          itemName: item.name,
          unit: item.unit,
          qty: Number(m.quantity || 0),
          note: m.note,
          parsed: parseOutwardNote(m.note),
        });
      });
    });

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [state.items]);

  /* ---- labor list for Site filter ---- */
  const allLabors = useMemo(() => {
    const set = new Set<string>();
    outwardRows.forEach((r) => {
      if (r.parsed.kind === "SITE" && r.parsed.labor) set.add(r.parsed.labor);
    });
    return ["__ALL__", ...Array.from(set).sort()];
  }, [outwardRows]);

  /* ---- mode-based filtered rows ---- */
  const filtered = useMemo(() => {
    if (mode === "INWARD") return inwardRows;

    let rows = outwardRows;
    if (mode === "SITE") {
      rows = rows.filter((r) => r.parsed.kind === "SITE");
      if (laborFilter !== "__ALL__") rows = rows.filter((r) => (r.parsed.kind === "SITE" ? r.parsed.labor === laborFilter : false));
    } else if (mode === "FACTORY") {
      rows = rows.filter((r) => r.parsed.kind === "FACTORY");
    }
    return rows;
  }, [mode, inwardRows, outwardRows, laborFilter]);

  const { page, pageCount, current, total, next, prev, reset } = usePaging(filtered, 15);

  React.useEffect(() => {
    reset();
  }, [mode, laborFilter]); // reset paging when filters change

  /* ---- CSV export ---- */
  function exportCSV() {
    let headers: string[] = [];
    let body: string[][] = [];

    if (mode === "INWARD") {
      headers = ["Date", "Item", "Unit", "Qty", "Price per Unit", "Purchaser", "Bill No.", "Bill Date"];
      body = (filtered as any[]).map((r) => [
        fmtDate(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        r.pricePerUnit !== undefined ? String(r.pricePerUnit) : "",
        r.purchaser || "",
        r.billNo || "",
        r.billDate ? fmtDate(r.billDate) : "",
      ]);
    } else if (mode === "ALL") {
      headers = ["Date", "Item", "Unit", "Qty", "Type", "Note"];
      body = (filtered as any[]).map((r) => [
        fmtDate(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        r.parsed.kind === "SITE" ? "Site Issue" : r.parsed.kind === "FACTORY" ? "Factory Issue" : "Outward",
        r.note || "",
      ]);
    } else if (mode === "SITE") {
      headers = ["Date", "Item", "Unit", "Qty", "To / Site", "Labor", "Work Order", "Scheme"];
      body = (filtered as any[]).map((r) => {
        const p = r.parsed.kind === "SITE" ? r.parsed : {};
        return [fmtDate(r.date), r.itemName, r.unit, String(r.qty), (p as any).toSite || "", (p as any).labor || "", (p as any).workOrder || "", (p as any).scheme || ""];
      });
    } else {
      // FACTORY
      headers = ["Date", "Item", "Unit", "Qty", "Department / Issue To", "Issue To Employee"];
      body = (filtered as any[]).map((r) => {
        const p = r.parsed.kind === "FACTORY" ? r.parsed : {};
        return [fmtDate(r.date), r.itemName, r.unit, String(r.qty), (p as any).department || "", (p as any).employee || ""];
      });
    }

    const rows = [headers, ...body];
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

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      mode === "INWARD"
        ? "inward.csv"
        : mode === "ALL"
        ? "outward_all.csv"
        : mode === "SITE"
        ? "site_material_issued.csv"
        : "factory_material_issued.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------------------- render ------------------------- */

  return (
    <div className="pb-24">
      <Header
        title={
          mode === "INWARD"
            ? "Inward"
            : mode === "ALL"
            ? "Outward (All)"
            : mode === "SITE"
            ? "Site Material Issued"
            : "Factory Material Issued"
        }
      />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="INWARD">Inward</option>
              <option value="ALL">Outward (All)</option>
              <option value="SITE">Site Material Issued</option>
              <option value="FACTORY">Factory Material Issued</option>
            </select>

            {mode === "SITE" && (
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={laborFilter}
                onChange={(e) => setLaborFilter(e.target.value)}
              >
                {allLabors.map((l) => (
                  <option key={l} value={l}>
                    {l === "__ALL__" ? "All Labors" : l}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={exportCSV}
              className="ml-auto px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              Export
            </button>
          </div>

          {/* Headers */}
          {mode === "INWARD" && (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-1">PRICE/UNIT</div>
              <div className="col-span-2">PURCHASER</div>
              <div className="col-span-1">BILL NO.</div>
              <div className="col-span-1">BILL DATE</div>
            </div>
          )}

          {mode === "ALL" && (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">TYPE</div>
              <div className="col-span-3">NOTE</div>
            </div>
          )}

          {mode === "SITE" && (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">TO / SITE</div>
              <div className="col-span-2">LABOR</div>
              <div className="col-span-1">WO</div>
              <div className="col-span-1">SCHEME</div>
            </div>
          )}

          {mode === "FACTORY" && (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-3">DEPARTMENT / ISSUE TO</div>
              <div className="col-span-2">ISSUE TO EMPLOYEE</div>
            </div>
          )}

          {/* Rows */}
          {current.length === 0 ? (
            <div className="text-gray-600 px-4 py-6">No entries.</div>
          ) : (
            <div className="divide-y">
              {current.map((r: any, idx: number) => {
                if (mode === "INWARD") {
                  return (
                    <div key={idx} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-1">{r.pricePerUnit !== undefined ? r.pricePerUnit : "—"}</div>
                      <div className="col-span-2 truncate">{r.purchaser || "—"}</div>
                      <div className="col-span-1 truncate">{r.billNo || "—"}</div>
                      <div className="col-span-1 truncate">{r.billDate ? fmtDate(r.billDate) : "—"}</div>
                    </div>
                  );
                }

                if (mode === "ALL") {
                  return (
                    <div key={idx} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-2">
                        {r.parsed.kind === "SITE" ? "Site Issue" : r.parsed.kind === "FACTORY" ? "Factory Issue" : "Outward"}
                      </div>
                      <div className="col-span-3 truncate">{r.note || "—"}</div>
                    </div>
                  );
                }

                if (mode === "SITE") {
                  const p = r.parsed.kind === "SITE" ? r.parsed : {};
                  return (
                    <div key={idx} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-2 truncate">{(p as any).toSite || "—"}</div>
                      <div className="col-span-2 truncate">{(p as any).labor || "—"}</div>
                      <div className="col-span-1 truncate">{(p as any).workOrder || "—"}</div>
                      <div className="col-span-1 truncate">{(p as any).scheme || "—"}</div>
                    </div>
                  );
                }

                // FACTORY
                const p = r.parsed.kind === "FACTORY" ? r.parsed : {};
                return (
                  <div key={idx} className="grid grid-cols-12 px-4 py-3">
                    <div className="col-span-2">{fmtDate(r.date)}</div>
                    <div className="col-span-3 truncate">{r.itemName}</div>
                    <div className="col-span-1">{r.unit}</div>
                    <div className="col-span-1">{r.qty}</div>
                    <div className="col-span-3 truncate">{(p as any).department || "—"}</div>
                    <div className="col-span-2 truncate">{(p as any).employee || "—"}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pager */}
          <div className="flex items-center gap-3 justify-between mt-4 text-sm text-gray-600">
            <div>
              Showing {(page - 1) * 15 + 1}-{Math.min(page * 15, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50" onClick={prev} disabled={page <= 1}>
                Prev
              </button>
              <div>
                Page {page} / {pageCount}
              </div>
              <button className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50" onClick={next} disabled={page >= pageCount}>
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
