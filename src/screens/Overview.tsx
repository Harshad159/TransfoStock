import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

const PAGE_SIZE = 15;

export default function Stock() {
  const { state } = useInventory();
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const base = [...(state.items as any[])].sort((a, b) =>
      String(a?.name ?? "").localeCompare(String(b?.name ?? ""))
    );
    if (!q.trim()) return base;
    const needle = q.trim().toLowerCase();
    return base.filter(
      (i) =>
        String(i?.name ?? "").toLowerCase().includes(needle) ||
        String(i?.description ?? "").toLowerCase().includes(needle)
    );
  }, [state.items, q]);

  // pagination
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(page, 1), pageCount);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const paged = items.slice(start, start + PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [q, state.items]);

  function exportCSV() {
    const rows = [
      ["Item Name", "Unit", "Current Stock", "Reorder Level", "Price", "Description"],
      ...(state.items as any[]).map((i) => [
        i?.name ?? "",
        i?.unit ?? "",
        String(i?.currentStock ?? 0),
        String(i?.reorderLevel ?? 0),
        String(i?.purchasePrice ?? 0),
        String(i?.description ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell);
            const needsQuote = /[",\n]/.test(s);
            const esc = s.replace(/"/g, '""');
            return needsQuote ? `"${esc}"` : esc;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Stock List</h2>
            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search items..."
                className="w-64 bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              />
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Export
              </button>
            </div>
          </div>

          {/* ====== TABLE (responsively scrollable) ====== */}
          <div className="overflow-x-auto">
            <div className="min-w-[760px] sm:min-w-0">
              {/* Header */}
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-4">ITEM NAME</div>
                <div className="col-span-1">UNIT</div>
                <div className="col-span-2">CURRENT STOCK</div>
                <div className="col-span-2">REORDER LEVEL</div>
                <div className="col-span-1">PRICE</div>
                <div className="col-span-2">DESCRIPTION</div>
              </div>

              {/* Rows */}
              {paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-gray-600">
                  <span className="material-icons text-5xl text-gray-400 mb-3">
                    inventory_2
                  </span>
                  <div className="text-xl font-semibold mb-1">
                    No Items in Stock
                  </div>
                  <div className="text-gray-500">
                    Add items using the &apos;Inward&apos; page to get started.
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {paged.map((i: any) => (
                    <div
                      key={i.id}
                      className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50 text-sm"
                    >
                      <div className="col-span-4 truncate font-medium">
                        {i?.name ?? ""}
                      </div>
                      <div className="col-span-1">{i?.unit ?? ""}</div>
                      <div className="col-span-2">{i?.currentStock ?? 0}</div>
                      <div
                        className={
                          "col-span-2 " +
                          ((i?.currentStock ?? 0) <= (i?.reorderLevel ?? 0)
                            ? "text-red-600 font-semibold"
                            : "")
                        }
                      >
                        {i?.reorderLevel ?? 0}
                      </div>
                      <div className="col-span-1">
                        {(i?.purchasePrice ?? 0).toFixed
                          ? (i?.purchasePrice ?? 0).toFixed(2)
                          : String(i?.purchasePrice ?? 0)}
                      </div>
                      <div className="col-span-2 truncate">
                        {i?.description || "—"}
                      </div>

                      {/* Your existing Edit/Delete buttons remain here if you have them */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
            <div>
              Showing {items.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, items.length)} of {items.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div>
                Page {pageSafe} / {pageCount}
              </div>
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={pageSafe >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
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
