import React, { useMemo } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

/**
 * Adds the Export button you already requested previously,
 * and fixes mobile overlap with horizontal scroll.
 */

export default function Alerts() {
  const { state } = useInventory();

  const low = useMemo(() => {
    const out: any[] = [];
    for (const i of state.items as any[]) {
      const stock = i?.currentStock ?? 0;
      const rl = i?.reorderLevel ?? 0;
      if (stock <= rl) out.push(i);
    }
    // sort by severity
    return out.sort(
      (a, b) =>
        (a?.currentStock ?? 0) - (a?.reorderLevel ?? 0) -
        ((b?.currentStock ?? 0) - (b?.reorderLevel ?? 0))
    );
  }, [state.items]);

  function exportCSV() {
    const rows = [
      ["Item Name", "Unit", "Current Stock", "Reorder Level"],
      ...low.map((i: any) => [
        i?.name ?? "",
        i?.unit ?? "",
        String(i?.currentStock ?? 0),
        String(i?.reorderLevel ?? 0),
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
    a.download = "low_stock_alerts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title="Low Stock Alerts" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span className="material-icons text-orange-500">warning</span>
              Low Stock Alerts
            </h2>
            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              Export
            </button>
          </div>

          {/* ====== TABLE (responsively scrollable) ====== */}
          <div className="overflow-x-auto">
            <div className="min-w-[680px] sm:min-w-0">
              {/* Header */}
              <div className="grid grid-cols-12 bg-red-100 text-red-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-6">ITEM NAME</div>
                <div className="col-span-2">UNIT</div>
                <div className="col-span-2">CURRENT STOCK</div>
                <div className="col-span-2">REORDER LEVEL</div>
              </div>

              {/* Rows / Empty */}
              {low.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-600">
                  <span className="material-icons text-green-500 text-6xl mb-3">
                    check_circle
                  </span>
                  <div className="text-2xl font-semibold mb-1">All Good!</div>
                  <div className="text-gray-500">
                    No items are currently below their reorder level.
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {low.map((i: any) => (
                    <div
                      key={i.id}
                      className="grid grid-cols-12 px-4 py-3 hover:bg-red-50 text-sm"
                    >
                      <div className="col-span-6 truncate font-medium">
                        {i?.name ?? ""}
                      </div>
                      <div className="col-span-2">{i?.unit ?? ""}</div>
                      <div className="col-span-2">{i?.currentStock ?? 0}</div>
                      <div className="col-span-2">{i?.reorderLevel ?? 0}</div>
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
