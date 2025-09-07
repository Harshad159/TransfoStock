import React, { useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Return() {
  const { state, dispatch } = useInventory();
  const [itemId, setItemId] = useState(state.items[0]?.id || "");
  const [qty, setQty] = useState<string>("");

  function save() {
    if (!itemId || !qty || parseFloat(qty) <= 0) return alert("Enter quantity");
    dispatch({
      type: "INWARD",
      payload: {
        item: {
          id: itemId,
          name: state.items.find(i => i.id===itemId)!.name,
          unit: state.items.find(i => i.id===itemId)!.unit,
          purchasePrice: state.items.find(i => i.id===itemId)!.purchasePrice || 0,
          description: state.items.find(i => i.id===itemId)!.description,
          openingStockDate: state.items.find(i => i.id===itemId)!.openingStockDate,
          reorderLevel: state.items.find(i => i.id===itemId)!.reorderLevel || 0,
        },
        movement: {
          id: crypto.randomUUID(),
          type: "RETURN",
          date: new Date().toISOString(),
          quantity: parseFloat(qty),
          note: "Return",
        },
      },
    });
    setQty("");
    alert("Return saved ✅");
  }

  return (
    <div className="pb-24">
      <Header title="Return" />
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <div className="space-y-3">
            <label className="block">
              <div className="text-sm font-medium">Item</div>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {state.items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium">Quantity</div>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. 5"
              />
            </label>

            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              onClick={save}
            >
              Save Return
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
