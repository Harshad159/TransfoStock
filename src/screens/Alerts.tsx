import React from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Alerts() {
  const { state } = useInventory();
  const low = state.items.filter(i => i.currentStock <= i.reorderLevel);

  return (
    <div className="pb-24">
      <Header title="Alerts" />
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {low.length === 0 ? (
          <Card>✅ No low-stock items</Card>
        ) : (
          low.map(i => (
            <Card key={i.id}>
              <div className="flex justify-between">
                <div className="font-medium">{i.name}</div>
                <div className="text-red-600">
                  {i.currentStock} (≤ {i.reorderLevel})
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
