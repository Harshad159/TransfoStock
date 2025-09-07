// /src/screens/Alerts.tsx
import React, { useMemo } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Alerts() {
  const { state } = useInventory();

  const lowItems = useMemo(
    () =>
      state.items
        .filter((i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? 0))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  return (
    <div className="pb-24">
      <Header title="Low Stock Alerts" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">Low Stock Alerts</h2>
          </div>

          {/* Scrollable table wrapper to prevent overlap on small screens */}
          <div className="overflow-x-auto">
            {/* Ensure a reasonable minimum width so columns don't crush */}
            <div className="min-w-[620px]">
              {/* Header row */}
              <div className="grid grid-cols-12 bg-rose-100 text-rose-900 font-semibold rounded-md px-4 py-3 text-sm">
                <div className="col-span-5">ITEM NAME</div>
                <div className="col-span-2">UNIT</div>
                <div className="col-span-2">CURRENT STOCK</div>
                <div className="col-span-3">REORDER LEVEL</div>
              </div>

              {/* Rows / Empty state */}
              {lowItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="material-icons text-5xl text-green-500 mb-3">
                    check_circle
                  </span>
                  <div className="text-xl font-semibold text-green-600">
                    All Good!
                  </div>
                  <div className="text-gray-500">
                    No items are currently below their reorder level.
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {lowItems.map((i) => (
                    <div
                      key={i.id}
                      className="grid grid-cols-12 px-4 py-3 text-sm"
                    >
                      <div className="col-span-5 truncate font-medium">
                        {i.name}
                      </div>
                      <div className="col-span-2">{i.unit}</div>
                      <div className="col-span-2">
                        {i.currentStock ?? 0}
                      </div>
                      <div className="col-span-3 text-red-600 font-semibold">
                        {i.reorderLevel ?? 0}
                      </div>
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
