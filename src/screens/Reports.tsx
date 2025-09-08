import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

/** Helpers */
type Mode = "ALL" | "SITE" | "FACTORY";

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
  | {
      kind: "UNKNOWN";
    };

/** Parse the outward movement note to figure out Site vs Factory metadata.
 * We keep this tolerant to minor formatting differences.
 */
function parseOutwardNote(note?: string): ParsedOutward {
  if (!note) return { kind: "UNKNOWN" };
  const n = note.toLowerCase();

  const valAfter = (label: string) => {
    // label like "Given To:", "Labor:", "WO:", "Scheme:", "Dept:", "Employee:"
    const i = n.indexOf(label.toLowerCase());
    if (i === -1) return undefined;
    const raw = note.slice(i + label.length).trim();
    // stop at next pipe if present
    const j = raw.indexOf("|");
    const v = (j === -1 ? raw : raw.slice(0, j)).trim();
    return v || undefined;
  };

  // Decide kind
  if (n.includes("site issue") || n.includes("given to:")) {
    return {
      kind: "SITE",
      toSite: valAfter("Given To:"),
      labor: valAfter("Labor:"),
      workOrder: valAfter("WO:"),
      scheme: valAfter("Scheme:"),
    };
  }

  if (n.includes("factory issue") || n.includes("dept:")) {
    return {
      kind: "FACTORY",
      department: valAfter("Dept:"),
      employee: valAfter("Employee:"),
    };
  }

  return { kind: "UNKNOWN" };
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

/** Simple client-side pagination */
function usePaging<T>(rows: T[], pageSize = 15) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);
  function next() {
    setPage((p) => Math.min(p + 1, pageCount));
  }
  function prev() {
    setPage((p) => Math.max(p - 1, 1));
  }
  function reset() {
    setPage(1);
  }
  return { page, pageCount, current, next, prev, reset, pageSize, total: rows.length };
}

export default function Reports() {
  const { state } = useInventory();

  const [mode, setMode] = useState<Mode>("ALL");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");

  // Build a flat outward table from item histories
  const outwardRows = useMemo(() => {
    const rows: Array<{
      date: string; // ISO
      itemName: string;
      unit: string;
      qty: number;
      note?: string;
      parsed: ParsedOutward;
    }> = [];

    state.items.forEach((item) => {
      (item.history || []).forEach((m) => {
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

    // newest first
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [state.items]);

  // Labor list (for Site mode)
  const allLabors = useMemo(() => {
    const set = new Set<string>();
    outwardRows.forEach((r) => {
      if (r.parsed.kind === "SITE" && r.parsed.labor) set.add(r.parsed.labor);
    });
    return ["__ALL__", ...Array.from(set).sort()];
  }, [outwardRows]);

  // Filter rows per mode
  const filtered = useMemo(() => {
    let rows = outwardRows;

    if (mode === "SITE") {
      rows = rows.filter((r) => r.parsed.kind === "SITE");
      if (laborFilter !== "__ALL__") {
        rows = rows.filter((r) => (r.parsed.kind === "SITE" ? r.parsed.labor === laborFilter : false));
      }
    } else if (mode === "FACTORY") {
      rows = rows.filter((r) => r.parsed.kind === "FACTORY");
    }

    return rows;
  }, [outwardRows, mode, laborFilter]);

  // Pagination (15 per page)
  const { page, pageCount, current, next, prev, reset, total } = usePaging(filtered, 15);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    reset();
  }, [mode, laborFilter]); // eslint-disable-line

  /** CSV Export */
  function exportCSV() {
    let headers: string[] = [];
    let body: string[][] = [];

    if (mode === "ALL") {
      headers = ["Date", "Item", "Unit", "Qty", "Type", "Note"];
      body = filtered.map((r) => [
        fmtDate(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        r.parsed.kind === "SITE" ? "Site Issue" : r.parsed.kind === "FACTORY" ? "Factory Issue" : "Outward",
        r.note || "",
      ]);
    } else if (mode === "SITE") {
      headers = ["Date", "Item", "Unit", "Qty", "To / Site", "Labor", "Work Order", "Scheme"];
      body = filtered.map((r) => {
        const p = r.parsed.kind === "SITE" ? r.parsed : { toSite: "", labor: "", workOrder: "", scheme: "" };
        return [fmtDate(r.date), r.itemName, r.unit, String(r.qty), p.toSite || "", p.labor || "", p.workOrder || "", p.scheme || ""];
      });
    } else {
      // FACTORY
      headers = ["Date", "Item", "Unit", "Qty", "Department / Issue To", "Issue To Employee"];
      body = filtered.map((r) => {
        const p = r.parsed.kind === "FACTORY" ? r.parsed : { department: "", employee: "" };
        return [fmtDate(r.date), r.itemName, r.unit, String(r.qty), p.department || "", p.employee || ""];
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
      mode === "ALL"
        ? "outward_all.csv"
        : mode === "SITE"
        ? "site_material_issued.csv"
        : "factory_material_issued.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header
        title={
          mode === "ALL"
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

          {/* Table headers */}
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

          {/* Rows / Empty state */}
          {current.length === 0 ? (
            <div className="text-gray-600 px-4 py-6">No entries.</div>
          ) : (
            <div className="divide-y">
              {current.map((r, idx) => {
                if (mode === "ALL") {
                  return (
                    <div key={idx} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-2">
                        {r.parsed.kind === "SITE"
                          ? "Site Issue"
                          : r.parsed.kind === "FACTORY"
                          ? "Factory Issue"
                          : "Outward"}
                      </div>
                      <div className="col-span-3 truncate">{r.note || "—"}</div>
                    </div>
                  );
                } else if (mode === "SITE") {
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
                } else {
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
                }
              })}
            </div>
          )}

          {/* Pager */}
          <div className="flex items-center gap-3 justify-between mt-4 text-sm text-gray-600">
            <div>
              Showing {(page - 1) * 15 + 1}-{Math.min(page * 15, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                onClick={prev}
                disabled={page <= 1}
              >
                Prev
              </button>
              <div>
                Page {page} / {pageCount}
              </div>
              <button
                className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                onClick={next}
                disabled={page >= pageCount}
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
