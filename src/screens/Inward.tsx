import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement } from "../types";

/** Helpers */
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type StagedRow = {
  id: string; // local row id
  existingItemId?: string; // if selected from existing
  name: string;
  unit: string;
  qty: string; // keep as string to avoid prefixed 0
  pricePerUnit: string;
  reorderLevel: string;
  description: string;
};

/** Units list (you can tune the order) */
const UNITS = [
  "Nos",
  "Kg",
  "Litre",
  "Meter",
  "Coil",
  "Bundle",
  "Bobbin",
  "Drum",
  "Roll",
  "Piece",
  "Set",
];

export default function Inward() {
  const { state, dispatch } = useInventory();

  /** Bill / header fields */
  const [inwardDate, setInwardDate] = useState<string>(todayISO());
  const [purchaser, setPurchaser] = useState<string>("");
  const [billNo, setBillNo] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(todayISO());

  /** Row editor state */
  const [existingItemId, setExistingItemId] = useState<string>("");
  const [newItemName, setNewItemName] = useState<string>("");
  const [unit, setUnit] = useState<string>("Nos");
  const [qty, setQty] = useState<string>("");
  const [pricePerUnit, setPricePerUnit] = useState<string>("");
  const [reorderLevel, setReorderLevel] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  /** Staged rows (items for this bill) */
  const [rows, setRows] = useState<StagedRow[]>([]);

  /** Derived: all items sorted for the selector */
  const allItems = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  /** When an existing item is picked, prefill unit / price / reorder (if present) */
  function onPickExisting(itemId: string) {
    setExistingItemId(itemId);
    setNewItemName("");
    const found = state.items.find((i) => i.id === itemId);
    if (found) {
      if (found.unit) setUnit(found.unit);
      if (found.purchasePrice != null)
        setPricePerUnit(String(found.purchasePrice));
      if (found.reorderLevel != null)
        setReorderLevel(String(found.reorderLevel));
      if (found.description) setDescription(found.description);
    }
  }

  /** Add one row to the staged list */
  function addRow() {
    // must choose either existing or new name
    const name = existingItemId
      ? state.items.find((i) => i.id === existingItemId)?.name || ""
      : newItemName.trim();

    if (!name) {
      alert("Select an existing item or enter a new item name.");
      return;
    }
    const nQty = parseFloat(qty || "0");
    if (!nQty || nQty <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    const row: StagedRow = {
      id: crypto.randomUUID(),
      existingItemId: existingItemId || undefined,
      name,
      unit: unit || "Nos",
      qty,
      pricePerUnit,
      reorderLevel,
      description,
    };
    setRows((r) => [row, ...r]);

    // clear the row editor but keep bill header
    setExistingItemId("");
    setNewItemName("");
    setUnit("Nos");
    setQty("");
    setPricePerUnit("");
    setReorderLevel("");
    setDescription("");
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  /** Save: push all staged rows as INWARD movements under the same bill meta */
  function saveTransaction() {
    if (rows.length === 0) {
      alert("Add at least one item for this bill.");
      return;
    }
    const inwISO = new Date(inwardDate).toISOString();
    const billISO = billDate ? new Date(billDate).toISOString() : undefined;

    for (const r of rows) {
      const baseExisting = r.existingItemId
        ? state.items.find((i) => i.id === r.existingItemId)
        : undefined;

      // Build the minimal base item object the reducer expects
      const baseItem: Omit<
        InventoryItem,
        "currentStock" | "history" | "deleteRequested"
      > = {
        id: baseExisting?.id || crypto.randomUUID(),
        name: r.name,
        unit: r.unit,
        purchasePrice: parseFloat(r.pricePerUnit || "0") || 0,
        description: r.description || "",
        openingStockDate: baseExisting?.openingStockDate,
        reorderLevel: parseFloat(r.reorderLevel || "0") || 0,
      };

      // Movement with bill metadata (cast to allow extra fields)
      const movement = {
        id: crypto.randomUUID(),
        type: "INWARD",
        date: inwISO, // THIS is the 'Inward Date' used in first column of Reports
        quantity: parseFloat(r.qty || "0"),
        // keep a short note; detailed meta goes as fields below
        note: `Inward entry`,
        purchaser: purchaser || "",
        billNo: billNo || "",
        billDate: billISO || null,
        pricePerUnit: parseFloat(r.pricePerUnit || "0") || 0,
      } as StockMovement & Record<string, any>;

      dispatch({ type: "INWARD", payload: { item: baseItem, movement } });
    }

    alert("Inward transaction saved ✅");

    // reset everything
    setInwardDate(todayISO());
    setPurchaser("");
    setBillNo("");
    setBillDate(todayISO());
    setExistingItemId("");
    setNewItemName("");
    setUnit("Nos");
    setQty("");
    setPricePerUnit("");
    setReorderLevel("");
    setDescription("");
    setRows([]);
  }

  function cancelAll() {
    setExistingItemId("");
    setNewItemName("");
    setUnit("Nos");
    setQty("");
    setPricePerUnit("");
    setReorderLevel("");
    setDescription("");
    setRows([]);
  }

  return (
    <div className="pb-24">
      <Header title="Inward Entry" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Heading */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Inward Entry</h2>
            <p className="text-gray-500 text-sm">
              Add new materials/items into stock.
            </p>
          </div>

          {/* Bill / header form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Inward Date
              </div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={inwardDate}
                onChange={(e) => setInwardDate(e.target.value)}
              />
            </label>

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
          </div>

          {/* Items editor */}
          <h3 className="text-lg font-semibold mb-3">Items to Receive</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item pick / new name */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Item</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={existingItemId}
                onChange={(e) => onPickExisting(e.target.value)}
              >
                <option value="">-- Add New Item --</option>
                {allItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                New Item Name
              </div>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. Copper Wire 12mm"
                value={newItemName}
                onChange={(e) => {
                  setNewItemName(e.target.value);
                  if (e.target.value) setExistingItemId("");
                }}
              />
            </label>

            {/* Quantity */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Quantity
              </div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 100"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>

            {/* Price per Unit */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Price per Unit
              </div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 25.50"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
              />
            </label>

            {/* Unit */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            {/* Reorder level */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Reorder Level
              </div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 20"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </label>

            {/* Description */}
            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Description
              </div>
              <textarea
                rows={3}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="Item details…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium"
            >
              <span className="material-icons text-sm">add</span>
              Add Item
            </button>
          </div>

          {/* Staged items table */}
          {rows.length > 0 && (
            <div className="mt-6">
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
                <div className="col-span-4">ITEM NAME</div>
                <div className="col-span-1">UNIT</div>
                <div className="col-span-2">QTY</div>
                <div className="col-span-2">PRICE/UNIT</div>
                <div className="col-span-2">REORDER</div>
                <div className="col-span-1 text-right">ACTIONS</div>
              </div>
              <div className="divide-y">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 px-4 py-3 items-center"
                  >
                    <div className="col-span-4 truncate font-medium">
                      {r.name}
                    </div>
                    <div className="col-span-1">{r.unit}</div>
                    <div className="col-span-2">{r.qty}</div>
                    <div className="col-span-2">
                      {(parseFloat(r.pricePerUnit || "0") || 0).toFixed(2)}
                    </div>
                    <div className="col-span-2">
                      {parseFloat(r.reorderLevel || "0") || 0}
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => removeRow(r.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              type="button"
              onClick={cancelAll}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              type="button"
              onClick={saveTransaction}
              disabled={rows.length === 0}
              title={rows.length === 0 ? "Add at least one item" : ""}
            >
              Save Transaction
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
