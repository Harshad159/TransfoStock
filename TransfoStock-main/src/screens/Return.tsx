import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { StockMovement } from "../types";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Return() {
  const { state, dispatch } = useInventory();

  const itemsSorted = useMemo(
    () => state.items.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [returnedFrom, setReturnedFrom] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>(todayISO());

  const selectedItem = itemId ? state.items.find((i) => i.id === itemId) : undefined;
  const unit = selectedItem?.unit ?? "";

  function reset() {
    setItemId("");
    setQty("");
    setReturnedFrom("");
    setReturnDate(todayISO());
  }

  function save() {
    if (!itemId) return alert("Please select an item to return.");
    const nQty = parseFloat(qty || "0");
    if (!nQty || nQty <= 0) return alert("Quantity must be greater than 0.");

    const base = state.items.find((i) => i.id === itemId);
    if (!base) return;

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      type: "RETURN",
      date: new Date(returnDate).toISOString(),
      quantity: nQty,
      note: returnedFrom ? `Returned from ${returnedFrom}` : "Return",
    };

    dispatch({ type: "RETURN", payload: { itemId: base.id, quantity: nQty, movement } });

    alert("Return transaction saved ✅");
    reset();
  }

  return (
    <div className="pb-24">
      <Header title="Return Entry" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Return Entry</h2>
            <p className="text-gray-500 text-sm">Return unused material back to stock.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Item to Return</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
                <option value="">-- Select Item --</option>
                {itemsSorted.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Quantity */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 10"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>

            {/* Unit (read-only, auto-selected from item) */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
              <input
                disabled
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={unit}
                placeholder="—"
              />
            </label>

            {/* Returned From */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Returned From</div>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. Site A"
                value={returnedFrom}
                onChange={(e) => setReturnedFrom(e.target.value)}
              />
            </label>

            {/* Return Date */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Return Date</div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              type="button"
              onClick={reset}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              type="button"
              onClick={save}
            >
              Save Transaction
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
