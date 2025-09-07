// /src/screens/Stock.tsx
import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Stock() {
  const { state } = useInventory();
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const base = [...state.items].sort((a, b) => a.name.localeCompare(b.name));
    if (!q.trim()) return base;
    const needle = q.trim().toLowerCase();
    return base.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        (i.description || "").toLowerCase().includes(needle)
    );
  }, [state.items, q]);

  function exportCSV() {
    const rows = [
      ["Item Name", "Unit", "Current Stock", "Reorder Level", "Price", "Description"],
      ...state.items.map((i) => [
        i.name,
        i.unit,
        String(i.currentStock ?? 0),
        String(i.reorderLevel ?? 0),
        (i.purchasePrice ?? 0).toString(),
        (i.description ?? "").replace(/\n/g, " "),
      ]),
    ];

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
    a.download = "transfostock_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title="Stock List" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Toolbar */}
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

          {/* Responsive table */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header row */}
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
                <div className="col-span-4">ITEM NAME</div>
                <div className="col-span-1">UNIT</div>
                <div className="col-span-2">CURRENT STOCK</div>
                <div className="col-span-2">REORDER LEVEL</div>
                <div className="col-span-1">PRICE</div>
                <div className="col-span-2">DESCRIPTION</div>
              </div>

              {/* Rows */}
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-gray-600">
                  <span className="material-icons text-5xl text-gray-400 mb-3">
                    inventory_2
                  </span>
                  <div className="text-xl font-semibold mb-1">No Items in Stock</div>
                  <div className="text-gray-500">
                    Add items using the &apos;Inward&apos; page to get started.
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {items.map((i) => (
                    <div key={i.id} className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
                      <div className="col-span-4 truncate font-medium">{i.name}</div>
                      <div className="col-span-1">{i.unit}</div>
                      <div className="col-span-2">{i.currentStock ?? 0}</div>
                      <div
                        className={
                          "col-span-2 " +
                          ((i.currentStock ?? 0) <= (i.reorderLevel ?? 0)
                            ? "text-red-600 font-semibold"
                            : "")
                        }
                      >
                        {i.reorderLevel ?? 0}
                      </div>
                      <div className="col-span-1">{(i.purchasePrice ?? 0).toFixed(2)}</div>
                      <div className="col-span-2 truncate">{i.description || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
