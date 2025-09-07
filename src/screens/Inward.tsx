import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement, Unit } from "../types";

const UNITS: Unit[] = ["Nos", "Kg", "Ltr", "Meter", "Set", "Box"];

type PendingItem = {
  existingId?: string;
  newName?: string;
  unit: Unit;
  quantity: string;    // keep as string for clean typing
  price: string;
  reorder: string;
  description: string;
};

export default function Inward() {
  const { state, dispatch } = useInventory();

  // Top transaction details
  const [txDate, setTxDate] = useState<string>(() => todayISO());
  const [purchaser, setPurchaser] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState<string>(() => todayISO());

  // “Items to Receive” (current editor)
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<Unit>("Nos");
  const [price, setPrice] = useState<string>("");
  const [reorder, setReorder] = useState<string>("");
  const [description, setDescription] = useState("");

  // Pending list before saving transaction
  const [pending, setPending] = useState<PendingItem[]>([]);

  const items = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function resetEditor() {
    setSelectedItemId("");
    setNewItemName("");
    setQuantity("");
    setUnit("Nos");
    setPrice("");
    setReorder("");
    setDescription("");
  }

  function addItem() {
    // minimal validation
    if (!selectedItemId && !newItemName.trim()) {
      alert("Select an existing item or enter a new item name.");
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    setPending((prev) => [
      ...prev,
      {
        existingId: selectedItemId || undefined,
        newName: selectedItemId ? undefined : newItemName.trim(),
        unit,
        quantity, // keep as typed
        price,
        reorder,
        description,
      },
    ]);

    resetEditor();
  }

  function removePending(idx: number) {
    setPending((p) => p.filter((_, i) => i !== idx));
  }

  function onSaveAll() {
    if (pending.length === 0) {
      // allow saving a single item if user didn't click + Add Item
      if (!selectedItemId && !newItemName.trim()) {
        alert("Add at least one item.");
        return;
      }
      if (!quantity || parseFloat(quantity) <= 0) {
        alert("Quantity must be greater than 0.");
        return;
      }
      addItem(); // pushes the current editor to pending
    }

    const list = pending.length > 0 ? pending : [];

    for (const row of list) {
      const parsedQty = parseFloat(row.quantity || "0");
      const parsedPrice = row.price ? parseFloat(row.price) : 0;
      const parsedReorder = row.reorder ? parseFloat(row.reorder) : 0;

      // base item
      let base: Omit<InventoryItem, "currentStock" | "history" | "deleteRequested">;

      if (row.existingId) {
        const found = state.items.find((i) => i.id === row.existingId)!;
        base = {
          id: found.id,
          name: found.name,
          unit: row.unit || found.unit,
          purchasePrice: parsedPrice || found.purchasePrice || 0,
          description: row.description || found.description,
          openingStockDate: found.openingStockDate,
          reorderLevel: parsedReorder || found.reorderLevel || 0,
        };
      } else {
        base = {
          id: crypto.randomUUID(),
          name: row.newName!,
          unit: row.unit,
          purchasePrice: parsedPrice || 0,
          description: row.description,
          openingStockDate: billDate,
          reorderLevel: parsedReorder || 0,
        };
      }

      const movement: StockMovement = {
        id: crypto.randomUUID(),
        type: "INWARD",
        date: new Date(txDate).toISOString(),
        quantity: parsedQty,
        purchaser,
        billNo,
        billDate,
        note: "Inward entry",
      };

      dispatch({ type: "INWARD", payload: { item: base, movement } });
    }

    alert("Inward transaction saved ✅");
    setPending([]);
    resetEditor();
  }

  return (
    <div className="pb-28">
      <Header title="Inward Entry" />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Transaction header row */}
        <Card>
          <h2 className="text-xl font-semibold mb-2">Inward Entry</h2>
          <p className="text-gray-500 text-sm mb-4">
            Add new materials/items into stock.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
              <input
                type="date"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
              />
            </label>

            {/* Purchaser */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Purchaser</div>
              <input
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. ABC Suppliers"
                value={purchaser}
                onChange={(e) => setPurchaser(e.target.value)}
              />
            </label>

            {/* Bill No */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Bill No.</div>
              <input
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. INV-12345"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </label>

            {/* Bill Date */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Bill Date</div>
              <input
                type="date"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </label>
          </div>
        </Card>

        {/* Items to Receive */}
        <Card>
          <h3 className="text-lg font-semibold mb-3">Items to Receive</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item / New Name */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Item</div>
              <select
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
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

            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">New Item Name</div>
              <input
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. Copper Wire 12mm"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                disabled={Boolean(selectedItemId)}
              />
            </label>

            {/* Quantity */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
              <input
                type="number"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>

            {/* Price per Unit */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Price per Unit</div>
              <input
                type="number"
                step="0.01"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 25.50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>

            {/* Unit */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
              <select
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
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

            {/* Reorder Level */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Reorder Level</div>
              <input
                type="number"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 20"
                value={reorder}
                onChange={(e) => setReorder(e.target.value)}
              />
            </label>

            {/* Description (full width) */}
            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
              <textarea
                rows={3}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none resize-y"
                placeholder="Item details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {/* Add Item */}
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <span className="material-icons text-base">add</span>
              Add Item
            </button>
          </div>

          {/* Pending list */}
          {pending.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <div className="text-sm font-semibold mb-2">Items added:</div>
              <ul className="divide-y">
                {pending.map((p, idx) => (
                  <li key={idx} className="py-2 flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {p.existingId
                          ? state.items.find((i) => i.id === p.existingId)?.name
                          : p.newName}
                      </span>{" "}
                      <span className="text-gray-500">
                        — {p.quantity} {p.unit}
                      </span>
                      {p.price && <span className="text-gray-500"> · ₹{p.price}</span>}
                    </div>
                    <button
                      className="text-red-600 text-sm"
                      onClick={() => removePending(idx)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setPending([]);
              resetEditor();
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveAll}
            className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
          >
            Save Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
