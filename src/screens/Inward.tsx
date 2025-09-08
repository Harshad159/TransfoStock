// /src/screens/Inward.tsx
import React, { useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement } from "../types";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Inward() {
  const { dispatch } = useInventory();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState(""); // dropdown value
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [openingStockDate, setOpeningStockDate] = useState(todayISO());
  const [reorderLevel, setReorderLevel] = useState("");
  const [purchaser, setPurchaser] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(todayISO());

  function reset() {
    setName("");
    setUnit("");
    setQty("");
    setPrice("");
    setDescription("");
    setOpeningStockDate(todayISO());
    setReorderLevel("");
    setPurchaser("");
    setBillNo("");
    setBillDate(todayISO());
  }

  function save() {
    if (!name.trim()) return alert("Please enter item name.");
    if (!unit) return alert("Please select a unit.");
    const nQty = parseFloat(qty || "0");
    if (nQty <= 0) return alert("Quantity must be greater than 0.");

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      unit,
      purchasePrice: parseFloat(price || "0"),
      description,
      openingStockDate,
      reorderLevel: parseFloat(reorderLevel || "0"),
      currentStock: nQty,
      history: [],
      deleteRequested: false,
    };

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      type: "INWARD",
      date: new Date().toISOString(),
      quantity: nQty,
      note: `Purchaser: ${purchaser || "-"}, Bill: ${billNo || "-"}, Date: ${
        billDate || "-"
      }`,
    };

    dispatch({ type: "INWARD", payload: { item: newItem, movement } });

    alert("Inward transaction saved ✅");
    reset();
  }

  return (
    <div className="pb-24">
      <Header title="Inward Entry" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Inward Entry</h2>
            <p className="text-gray-500 text-sm">
              Add new materials/items into stock.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Name */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Item Name</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Copper Wire"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            {/* Unit (Dropdown) */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Unit</div>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="">-- Select Unit --</option>
                <option value="Nos">Nos</option>
                <option value="Kg">Kg</option>
                <option value="Ltr">Ltr</option>
                <option value="Bundles">Bundles</option>
                <option value="Bobbins">Bobbins</option>
              </select>
            </label>

            {/* Quantity */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Quantity</div>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. 100"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>

            {/* Price per Unit */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Price per Unit</div>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. 500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>

            {/* Description */}
            <label className="block md:col-span-2">
              <div className="text-sm font-medium mb-1">Description</div>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Copper winding wire 250 AMP"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            {/* Opening Stock Date */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Opening Stock Date</div>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={openingStockDate}
                onChange={(e) => setOpeningStockDate(e.target.value)}
              />
            </label>

            {/* Reorder Level */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Reorder Level</div>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. 20"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </label>

            {/* Purchaser Name */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Purchaser Name</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. John Smith"
                value={purchaser}
                onChange={(e) => setPurchaser(e.target.value)}
              />
            </label>

            {/* Bill No */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Bill No</div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. INV-1234"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </label>

            {/* Bill Date */}
            <label className="block">
              <div className="text-sm font-medium mb-1">Bill Date</div>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </label>
          </div>

          {/* Actions */}
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
