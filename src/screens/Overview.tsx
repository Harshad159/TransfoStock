import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

// Build a weighted-average cost from INWARD movements.
// Falls back to item.purchasePrice if you never recorded price on any inward.
function computeAvgCostForItem(itemId: string, movements: any[], fallback = 0): number {
  let qtySum = 0;
  let costSum = 0;

  for (const m of movements) {
    if (m.type !== "INWARD") continue;
    // Support either movement.itemId or legacy movement.item?.id
    const mid = m.itemId || m.item?.id;
    if (mid !== itemId) continue;

    const q = Number(m.quantity) || 0;
    // Prefer meta.pricePerUnit; fall back to parsed "Price" from note, then 0
    const p =
      (m.meta && typeof m.meta.pricePerUnit !== "undefined" ? Number(m.meta.pricePerUnit) : NaN) ||
      extractPriceFromNote(m.note);

    if (q > 0 && isFinite(p)) {
      qtySum += q;
      costSum += q * p;
    }
  }

  if (qtySum <= 0) {
    return Number.isFinite(fallback) ? Number(fallback) : 0;
  }
  return costSum / qtySum;
}

// Try to parse “… Price: 12.5 …” in legacy notes as a fallback.
function extractPriceFromNote(note?: string): number {
  if (!note) return 0;
  const m = note.match(/price\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
  return m ? Number(m[1]) : 0;
}

// CSV helper
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

export default function Stock() {
  const { state } = useInventory();

  // UI state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Enrich items with avg cost (weighted) using movements.
  const enriched = useMemo(() => {
    return state.items.map((i) => {
      const avgCost = computeAvgCostForItem(i.id, state.movements, i.purchasePrice ?? 0);
      return {
        ...i,
        avgCost,
      };
    });
  }, [state.items, state.movements]);

  // Filter + sort (by name) BEFORE pagination so search spans all pages.
  const filtered = useMemo(() => {
    const base = [...enriched].sort((a, b) => a.name.localeCompare(b.name));
    if (!q.trim()) return base;
    const needle = q.trim().toLowerCase();
    return base.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        (i.description || "").toLowerCase().includes(needle) ||
        (i.unit || "").toLowerCase().includes(needle)
    );
  }, [enriched, q]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export visible data (full filtered set, not just current page).
  function exportCSV() {
    const rows = [
      ["Item Name", "Unit", "Current Stock", "Reorder Level", "Price", "Description"],
      ...filtered.map((i) => [
        i.name,
        i.unit,
        String(i.currentStock ?? 0),
        String(i.reorderLevel ?? 0),
        (Number(i.avgCost) || 0).toFixed(2),
        (i.description ?? "").replace(/\n/g, " "),
      ]),
    ];
    const blob = toCSV(rows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title="Stock List" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Top toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-2xl font-semibold">Stock List</h2>
            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1); // reset pager when searching
                }}
                placeholder="Search items..."
                className="w-72 bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              />
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Export
              </button>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
            <div className="col-span-4">ITEM NAME</div>
            <div className="col-span-2">UNIT</div>
            <div className="col-span-2">CURRENT STOCK</div>
            <div className="col-span-2">REORDER LEVEL</div>
            <div className="col-span-1">PRICE</div>
            <div className="col-span-1">DESCRIPTION</div>
          </div>

          {/* Rows / Empty state */}
          {pageRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-gray-600">
              <span className="material-icons text-5xl text-gray-400 mb-3">inventory_2</span>
              <div className="text-xl font-semibold mb-1">No Items in Stock</div>
              <div className="text-gray-500">Add items using the &apos;Inward&apos; page to get started.</div>
            </div>
          ) : (
            <div className="divide-y">
              {pageRows.map((i) => (
                <div key={i.id} className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
                  <div className="col-span-4 truncate font-medium">{i.name}</div>
                  <div className="col-span-2">{i.unit}</div>
                  <div className="col-span-2">{i.currentStock ?? 0}</div>
                  <div
                    className={
                      "col-span-2 " +
                      ((i.currentStock ?? 0) <= (i.reorderLevel ?? 0) ? "text-red-600 font-semibold" : "")
                    }
                  >
                    {i.reorderLevel ?? 0}
                  </div>
                  <div className="col-span-1">{(Number(i.avgCost) || 0).toFixed(2)}</div>
                  <div className="col-span-1 truncate">{i.description || "—"}</div>
                </div>
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
