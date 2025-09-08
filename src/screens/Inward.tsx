import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement } from "../types";

/** Keep the familiar “today” helper */
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Added more unit choices (incl. Bundles, Bobbins) */
const UNIT_OPTIONS = [
  "Nos",
  "Kg",
  "Meter",
  "Litre",
  "Bundle",
  "Bobbins",
  "Set",
  "Box",
  "Roll",
  "Piece",
];

type PendingRow = {
  itemId?: string;          // existing item id (if selected)
  newName?: string;         // new item name (if creating)
  unit: string;
  qty: string;              // keep as string for easy typing
  price: string;            // optional
  reorder: string;          // optional
  desc: string;             // optional
};

export default function Inward() {
  const { state, dispatch } = useInventory();

  // --- Bill header (same as your earlier screen) ---
  const [date, setDate] = useState<string>(todayISO());
  const [purchaser, setPurchaser] = useState<string>("");
  const [billNo, setBillNo] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(todayISO());

  // --- “current row” in the Items to Receive form ---
  const [row, setRow] = useState<PendingRow>({
    itemId: "",
    newName: "",
    unit: "Nos",
    qty: "",
    price: "",
    reorder: "",
    desc: "",
  });

  // --- List of rows added with the (+ Add Item) button ---
  const [pending, setPending] = useState<PendingRow[]>([]);

  // Sorted item options
  const itemsSorted = useMemo(
    () => state.items.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  function resetAll() {
    setDate(todayISO());
    setPurchaser("");
    setBillNo("");
    setBillDate(todayISO());
    setRow({
      itemId: "",
      newName: "",
      unit: "Nos",
      qty: "",
      price: "",
      reorder: "",
      desc: "",
    });
    setPending([]);
  }

  /** Add one row to the list, keep the UI layout you already use */
  function addRow() {
    const useExisting = !!row.itemId;
    const useNew = !!row.newName?.trim();

    if (!useExisting && !useNew) {
      alert("Select an item OR type a new item name.");
      return;
    }
    if (useExisting && useNew) {
      alert("Choose existing OR new item — not both.");
      return;
    }
    const nQty = parseFloat(row.qty || "0");
    if (!nQty || nQty <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    setPending((prev) => [
      ...prev,
      {
        itemId: useExisting ? row.itemId : undefined,
        newName: useNew ? row.newName!.trim() : undefined,
        unit: row.unit,
        qty: row.qty,
        price: row.price,
        reorder: row.reorder,
        desc: row.desc,
      },
    ]);

    // clear the entry row (keep unit for faster entry)
    setRow((r) => ({
      itemId: "",
      newName: "",
      unit: r.unit,
      qty: "",
      price: "",
      reorder: "",
      desc: "",
    }));
  }

  function removeRow(idx: number) {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  }

  /** Save all rows under the same ‘bill’ */
  function saveAll() {
    if (pending.length === 0) {
      alert("Add at least one item to receive.");
      return;
    }

    pending.forEach((p) => {
      // Resolve the base item (existing or new)
      let base = p.itemId ? state.items.find((i) => i.id === p.itemId) : undefined;

      const purchasePrice = parseFloat(p.price || "0") || 0;
      const reorderLevel = parseFloat(p.reorder || "0") || 0;
      const quantity = parseFloat(p.qty || "0");

      const movementNote = [
        purchaser ? `Purchaser: ${purchaser}` : "",
        billNo ? `Bill: ${billNo}` : "",
        p.desc ? `Note: ${p.desc}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const movement: StockMovement = {
        id: crypto.randomUUID(),
        type: "INWARD",
        date: new Date(billDate || date).toISOString(),
        quantity,
        note: movementNote || "Inward",
      };

      // Prepare the “base item” structure expected by the reducer
      let baseItem: Omit<
        InventoryItem,
        "currentStock" | "history" | "deleteRequested"
      >;

      if (!base) {
        // Create new item
        baseItem = {
          id: crypto.randomUUID(),
          name: p.newName!,                 // validated earlier
          unit: p.unit,
          purchasePrice,
          description: p.desc || "",
          openingStockDate: new Date(date).toISOString(),
          reorderLevel,
        };
      } else {
        // Existing item (you can pass updated price/reorder if you want them refreshed)
        baseItem = {
          id: base.id,
          name: base.name,
          unit: base.unit,                  // keep existing unit
          purchasePrice: base.purchasePrice ?? purchasePrice,
          description: base.description ?? "",
          openingStockDate: base.openingStockDate,
          reorderLevel: base.reorderLevel ?? reorderLevel,
        };
      }

      dispatch({ type: "INWARD", payload: { item: baseItem, movement } });
    });

    alert("Inward transaction saved ✅");
    resetAll();
  }

  // If user selected an existing item, show its unit (but still allow changing).
  const selectedUnit =
    row.itemId &&
    state.items.find((i) => i.id === row.itemId)?.unit;

  return (
    <div className="pb-24">
      <Header title="Inward Entry" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Heading */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Inward Entry</h2>
            <p className="text-gray-500 text-sm">Add new materials/items into stock.</p>
          </div>

          {/* Bill header (unchanged layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Purchaser</div>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. ABC Suppliers"
                value={purchaser}
                onChange={(e) => setPurchaser(e.target.value)}
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Bill No.</div>
              <input
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. INV-12345"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Bill Date</div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </label>
          </div>

          {/* Items to Receive (same two-column block + Add Item) */}
          <h3 className="text-lg font-semibold mb-3">Items to Receive</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* existing/new item chooser */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Item</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={row.itemId}
                onChange={(e) =>
                  setRow((r) => ({
                    ...r,
                    itemId: e.target.value,
                    newName: "", // clear new name if selecting existing
                    unit: e.target.value
                      ? state.items.find((i) => i.id === e.target.value)?.unit || r.unit
                      : r.unit,
                  }))
                }
              >
                <option value="">-- Add New Item --</option>
                {itemsSorted.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">New Item Name</div>
              <input
                disabled={!!row.itemId}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none disabled:bg-gray-100"
                placeholder="e.g. Copper Wire 12mm"
                value={row.newName}
                onChange={(e) => setRow((r) => ({ ...r, newName: e.target.value }))}
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 100"
                value={row.qty}
                onChange={(e) => setRow((r) => ({ ...r, qty: e.target.value }))}
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Price per Unit</div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 25.50"
                value={row.price}
                onChange={(e) => setRow((r) => ({ ...r, price: e.target.value }))}
              />
            </label>

            {/* Unit (kept as dropdown; prefilled if existing item selected) */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={selectedUnit || row.unit}
                onChange={(e) => setRow((r) => ({ ...r, unit: e.target.value }))}
                disabled={!!row.itemId} // lock unit if existing item
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Reorder Level</div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 20"
                value={row.reorder}
                onChange={(e) => setRow((r) => ({ ...r, reorder: e.target.value }))}
              />
            </label>

            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
              <textarea
                rows={3}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="Item details..."
                value={row.desc}
                onChange={(e) => setRow((r) => ({ ...r, desc: e.target.value }))}
              />
            </label>
          </div>

          {/* Add Item button (same place) */}
          <div className="mt-4">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <span className="material-icons text-base">add</span>
              Add Item
            </button>
          </div>

          {/* Pending list (simple summary like before) */}
          {pending.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-sm text-gray-600">
                {pending.length} item{pending.length > 1 ? "s" : ""} to be received
              </div>
              <div className="divide-y rounded-lg border border-gray-200 bg-white">
                {pending.map((p, idx) => {
                  const label =
                    p.itemId
                      ? itemsSorted.find((i) => i.id === p.itemId)?.name || "Item"
                      : p.newName || "New Item";
                  return (
                    <div key={idx} className="flex items-center justify-between px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{label}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {p.qty} {p.unit}
                          {p.price ? ` · ₹${p.price}` : ""}{" "}
                          {p.reorder ? ` · Reorder ${p.reorder}` : ""}{" "}
                          {p.desc ? ` · ${p.desc}` : ""}
                        </div>
                      </div>
                      <button
                        className="text-red-600 hover:text-red-700 ml-3"
                        onClick={() => removeRow(idx)}
                        aria-label="Remove"
                        title="Remove"
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer actions (same “Cancel” + “Save Transaction”) */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              type="button"
              onClick={resetAll}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              type="button"
              onClick={saveAll}
            >
              Save Transaction
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
