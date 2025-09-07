import React, { useMemo } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Alerts() {
  const { state } = useInventory();

  // Items at or below their reorder level
  const low = useMemo(
    () =>
      state.items
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter((i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? -1)),
    [state.items]
  );

  return (
    <div className="pb-24">
      <Header title="Low Stock Alerts" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Title */}
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <span className="material-icons text-orange-500">warning</span>
            Low Stock Alerts
          </h2>

          {/* Table Header (pink) */}
          <div className="grid grid-cols-12 bg-red-100 text-red-800 font-semibold rounded-md px-4 py-3 mb-2">
            <div className="col-span-6">ITEM NAME</div>
            <div className="col-span-2">UNIT</div>
            <div className="col-span-2">CURRENT STOCK</div>
            <div className="col-span-2">REORDER LEVEL</div>
          </div>

          {/* Rows or Empty State */}
          {low.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-icons text-green-500 text-5xl mb-3">check_circle</span>
              <div className="text-green-600 text-xl font-semibold mb-1">All Good!</div>
              <div className="text-gray-600">
                No items are currently below their reorder level.
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {low.map((i) => (
                <div key={i.id} className="grid grid-cols-12 px-4 py-3">
                  <div className="col-span-6 font-medium">{i.name}</div>
                  <div className="col-span-2">{i.unit}</div>
                  <div className="col-span-2 text-red-700 font-semibold">{i.currentStock ?? 0}</div>
                  <div className="col-span-2">{i.reorderLevel ?? 0}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
