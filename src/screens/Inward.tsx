import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement, Unit } from "../types";

const UNITS: Unit[] = ["Nos", "Kg", "Ltr", "Meter", "Set", "Box"];

export default function Inward() {
  const { state, dispatch } = useInventory();

  // ----- Form state -----
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState<string>("");   // ⬅️ string instead of number
  const [unit, setUnit] = useState<Unit>("Nos");
  const [purchaser, setPurchaser] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [price, setPrice] = useState<string>("");         // ⬅️ string
  const [reorder, setReorder] = useState<string>("");     // ⬅️ string
  const [description, setDescription] = useState("");

  const items = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  // ----- Helpers -----
  function resetForm() {
    setSelectedItemId("");
    setNewItemName("");
    setQuantity("");
    setUnit("Nos");
    setPurchaser("");
    setBillNo("");
    setBillDate(() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    });
    setPrice("");
    setReorder("");
    setDescription("");
  }

  function validate(): string | null {
    if (!selectedItemId && !newItemName.trim())
      return "Select an existing item or enter a new item name.";
    if (!quantity || parseFloat(quantity) <= 0)
      return "Quantity must be greater than 0.";
    return null;
  }

  function onSave() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    // Build item
    let baseItem: Omit<
      InventoryItem,
      "currentStock" | "history" | "deleteRequested"
    >;

    if (selectedItemId) {
      const found = state.items.find((i) => i.id === selectedItemId)!;
      baseItem = {
        id: found.id,
        name: found.name,
        unit: unit || found.unit,
        purchasePrice: price ? parseFloat(price) : found.purchasePrice || 0,
        description: description || found.description,
        openingStockDate: found.openingStockDate,
        reorderLevel: reorder ? parseFloat(reorder) : found.reorderLevel || 0,
      };
    } else {
      baseItem = {
        id: crypto.randomUUID(),
        name: newItemName.trim(),
        unit,
        purchasePrice: price ? parseFloat(price) : 0,
        description,
        openingStockDate: billDate,
        reorderLevel: reorder ? parseFloat(reorder) : 0,
      };
    }

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      type: "INWARD",
      date: new Date().toISOString(),
      quantity: parseFloat(quantity),
      purchaser,
      billNo,
      billDate,
      note: "Inward entry",
    };

    dispatch({ type: "INWARD", payload: { item: baseItem, movement } });

    alert("Inward transaction saved ✅");
    resetForm();
  }

  return (
    <div className="pb-24">
      <Header title="Inward Entry" />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Card>
          <h2 className="text-xl font-semibold mb-2">Inward Entry</h2>

          {/* Quantity */}
          <label className="block mb-2">
            <span className="text-sm font-medium text-gray-700">Quantity</span>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g. 100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>

          {/* Price per Unit */}
          <label className="block mb-2">
            <span className="text-sm font-medium text-gray-700">Price per Unit</span>
            <input
              type="number"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g. 25.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>

          {/* Reorder Level */}
          <label className="block mb-2">
            <span className="text-sm font-medium text-gray-700">Reorder Level</span>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g. 20"
              value={reorder}
              onChange={(e) => setReorder(e.target.value)}
            />
          </label>

          {/* Save */}
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-lg mt-4"
            onClick={onSave}
          >
            Save Transaction
          </button>
        </Card>
      </div>
    </div>
  );
}
