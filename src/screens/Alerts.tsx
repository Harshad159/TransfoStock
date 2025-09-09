import React, { useMemo } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

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

export default function Alerts() {
  const { state } = useInventory();

  // Items at or below reorder level
  const low = useMemo(() => {
    return state.items
      .filter((i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? 0))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.items]);

  function exportCSV() {
    const rows: (string | number)[][] = [
      ["Item Name", "Unit", "Current Stock", "Reorder Level"],
      ...low.map((i) => [
        i.name,
        i.unit,
        String(i.currentStock ?? 0),
        String(i.reorderLevel ?? 0),
      ]),
    ];
    const blob = toCSV(rows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "low_stock_alerts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title="Low Stock Alerts" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Top bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span className="material-icons text-orange-500">warning</span>
              Low Stock Alerts
            </h2>
            <button
              onClick={exportCSV}
              disabled={low.length === 0}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50"
              title={low.length === 0 ? "No low stock items to export" : "Export to CSV"}
            >
              Export
            </button>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-12 bg-red-100 text-red-800 font-semibold rounded-md px-4 py-3">
            <div className="col-span-6 md:col-span-5">ITEM NAME</div>
            <div className="col-span-2 md:col-span-2">UNIT</div>
            <div className="col-span-2 md:col-span-2">CURRENT STOCK</div>
            <div className="col-span-2 md:col-span-3">REORDER LEVEL</div>
          </div>

          {/* Body */}
          {low.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-600">
              <span className="material-icons text-5xl text-green-500 mb-3">check_circle</span>
              <div className="text-xl font-semibold mb-1">All Good!</div>
              <div className="text-gray-500">
                No items are currently below their reorder level.
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {low.map((i) => (
                <div key={i.id} className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
                  <div className="col-span-6 md:col-span-5 truncate font-medium">{i.name}</div>
                  <div className="col-span-2 md:col-span-2">{i.unit}</div>
                  <div className="col-span-2 md:col-span-2">{i.currentStock ?? 0}</div>
                  <div className="col-span-2 md:col-span-3 text-red-700 font-semibold">
                    {i.reorderLevel ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
