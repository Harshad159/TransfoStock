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
  const [quantity, setQuantity] = useState<string>("");     // ← string (empty by default)
  const [unit, setUnit] = useState<Unit>("Nos");
  const [purchaser, setPurchaser] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`; // for <input type="date">
  });
  const [price, setPrice] = useState<string>("");           // ← string (empty by default)
  const [reorder, setReorder] = useState<string>("");       // ← string (empty by default)
  const [description, setDescription] = useState("");

  // existing items sorted by name
  const items = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  // ----- Helpers -----
  function resetForm() {
    setSelectedItemId("");
    setNewItemName("");
    setQuantity("");               // ← empty
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
    setPrice("");                  // ← empty
    setReorder("");                // ← empty
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

    const parsedQty = parseFloat(quantity || "0");
    const parsedPrice = price ? parseFloat(price) : 0;
    const parsedReorder = reorder ? parseFloat(reorder) : 0;

    // Build base item (for new or update-existing)
    let baseItem: Omit<
      InventoryItem,
      "currentStock" | "history" | "deleteRequested"
    >;

    if (selectedItemId) {
      // use existing item's details as base, but allow unit/price/reorder/description overrides
      const found = state.items.find((i) => i.id === selectedItemId)!;
      baseItem = {
        id: found.id,
        name: found.name,
        unit: unit || found.unit,
        purchasePrice: parsedPrice || found.purchasePrice || 0,
        description: description || found.description,
        openingStockDate: found.openingStockDate,
        reorderLevel: parsedReorder || found.reorderLevel || 0,
      };
    } else {
      baseItem = {
        id: crypto.randomUUID(),
        name: newItemName.trim(),
        unit,
        purchasePrice: parsedPrice || 0,
        description,
        openingStockDate: billDate,
        reorderLevel: parsedReorder || 0,
      };
    }

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      type: "INWARD",
      date: new Date().toISOString(),
      quantity: parsedQty,            // ← parsed from string
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
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold">Inward Entry</h2>
              <p className="text-gray-500 text-sm">
                Add new materials/items into stock.
              </p>
            </div>
          </div>

          {/* Item selector */}
          <div className="grid grid-cols-1 gap-4 mb-2">
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Item</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={selectedItemId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedItemId(id);
                  if (id) {
                    const found = state.items.find((i) => i.id === id);
                    if (found) {
                      setUnit(found.unit);
                      setPrice(
                        found.purchasePrice != null && !Number.isNaN(found.purchasePrice)
                          ? String(found.purchasePrice)
                          : ""
                      );
                      setReorder(
                        found.reorderLevel != null && !Number.isNaN(found.reorderLevel)
                          ? String(found.reorderLevel)
                          : ""
                      );
                      setDescription(found.description || "");
                    }
                    setNewItemName("");
                  } else {
                    // moving back to "-- Add New Item --"
                    setPrice("");
                    setReorder("");
                    setDescription("");
                  }
                }}
              >
                <option value="">-- Add New Item --</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Two-column form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* New Item Name */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                New Item Name
              </div>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. Copper Wire 12mm"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                disabled={Boolean(selectedItemId)}
              />
            </label>

            {/* Quantity */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Quantity
              </div>
              <input
                type="number"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 100"
                value={quantity}                         // ← string
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>

            {/* Unit */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            {/* Purchaser */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Purchaser
              </div>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. ABC Suppliers"
                value={purchaser}
                onChange={(e) => setPurchaser(e.target.value)}
              />
            </label>

            {/* Bill No */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Bill No.
              </div>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. INV-12345"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </label>

            {/* Bill Date */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Bill Date
              </div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </label>

            {/* Price per Unit */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Price per Unit
              </div>
              <input
                type="number"
                step="0.01"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 25.50"
                value={price}                            // ← string
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>

            {/* Reorder Level */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Reorder Level
              </div>
              <input
                type="number"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 20"
                value={reorder}                          // ← string
                onChange={(e) => setReorder(e.target.value)}
              />
            </label>

            {/* Description (full width on md) */}
            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Description
              </div>
              <textarea
                rows={3}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none resize-y"
                placeholder="e.g. High-quality insulated copper wire for transformers."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              onClick={onSave}
              type="button"
            >
              Save Transaction
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
