import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

// Small helpers
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const UNITS = ["Nos", "Kg", "Litre", "Meter", "Bundle", "Bobbins"] as const;

export default function Inward() {
  const { state, dispatch } = useInventory();

  function fmtDate(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  }

  // Header (bill-level) fields
  const [inwardDate, setInwardDate] = useState<string>(isoToday()); // shop in-date
  const [billNo, setBillNo] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(isoToday()); // bill date
  const [purchaser, setPurchaser] = useState<string>("");

  // One item row (we allow adding many rows)
  type InwardRow = {
    itemId: string; // "" means adding a new item name
    newName: string;
    qty: string;
    unit: string;
    price: string;
    reorderLevel: string;
    description: string;
  };

  const [rows, setRows] = useState<InwardRow[]>([
    {
      itemId: "",
      newName: "",
      qty: "",
      unit: "Nos",
      price: "",
      reorderLevel: "",
      description: "",
    },
  ]);

  const itemsSorted = useMemo(
    () => state.items.slice().sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [state.items]
  );

  const inwardEntries = useMemo(
    () =>
      (state.movements as any[])
        .filter((m) => m.type === "INWARD")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.movements]
  );

  function setRow<K extends keyof InwardRow>(idx: number, key: K, val: InwardRow[K]) {
    setRows((prev) => {
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], [key]: val };
      // If picking an existing item, auto fill unit & price if available
      if (key === "itemId") {
        const found = state.items.find((it: any) => it.id === val);
        if (found) {
          copy[idx].unit = found.unit ?? "Nos";
          if (found.purchasePrice != null) copy[idx].price = String(found.purchasePrice);
          if (found.reorderLevel != null) copy[idx].reorderLevel = String(found.reorderLevel);
        }
      }
      return copy;
    });
  }

  function addRow() {
    setRows((r) => [
      ...r,
      {
        itemId: "",
        newName: "",
        qty: "",
        unit: "Nos",
        price: "",
        reorderLevel: "",
        description: "",
      },
    ]);
  }

  function removeRow(i: number) {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, idx) => idx !== i)));
  }

  function resetForm() {
    setInwardDate(isoToday());
    setBillNo("");
    setBillDate(isoToday());
    setPurchaser("");
    setRows([
      {
        itemId: "",
        newName: "",
        qty: "",
        unit: "Nos",
        price: "",
        reorderLevel: "",
        description: "",
      },
    ]);
  }

  // Save all rows as one bill (creates movements, and new items if needed)
  function saveAll() {
    const idOrNameMissing = rows.some((r) => !r.itemId && !r.newName.trim());
    if (idOrNameMissing) return alert("Please select an item or enter a new item name.");
    const badQty = rows.some((r) => !Number(r.qty));
    if (badQty) return alert("Every row must have a valid quantity.");

    // Create movements per row
    rows.forEach((r) => {
      const qtyNum = Number(r.qty || 0);
      const priceNum = Number(r.price || 0);
      const reorderNum = Number(r.reorderLevel || 0);
      const unit = r.unit || "Nos";
      const desc = r.description || "";

      // Build the item payload used by your reducer for INWARD
      // (We keep fields your reducer expects; extra fields are ignored by reducer.)
      const itemPayload: any = r.itemId
        ? // Existing item
          {
            id: r.itemId,
            name: (state.items.find((it: any) => it.id === r.itemId) || {}).name || "",
            unit,
            purchasePrice: priceNum,
            description: desc,
            reorderLevel: reorderNum,
            openingStockDate: inwardDate, // harmless if your reducer doesn't use it
          }
        : // New item
          {
            id: crypto.randomUUID(),
            name: r.newName.trim(),
            unit,
            purchasePrice: priceNum,
            description: desc,
            reorderLevel: reorderNum,
            openingStockDate: inwardDate,
          };

      const movement: any = {
        id: crypto.randomUUID(),
        type: "INWARD",
        // IMPORTANT:
        //  - date: the *inward date* (what appears as the first “DATE” column in reports)
        //  - billDate kept separately on movement meta so we can export it too
        date: new Date(inwardDate).toISOString(),
        quantity: qtyNum,
        note: "Inward entry",
        // attach bill-level info so Reports can export Purchaser/Bill/Price:
        meta: {
          purchaser,
          billNo,
          billDate,
          pricePerUnit: priceNum,
        },
      };

      dispatch({ type: "INWARD", payload: { item: itemPayload, movement } });
    });

    alert("Saved ✅");
    resetForm();
  }

  return (
    <div className="pb-24">
      <Header title="Inward Entry" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Bill level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Inward Date</div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={inwardDate}
                onChange={(e) => setInwardDate(e.target.value)}
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

          {/* Rows */}
          <h3 className="mt-8 mb-2 text-lg font-semibold">Items to Receive</h3>
          <div className="flex flex-col gap-6">
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4">
                {/* Existing item OR new item name */}
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Item</div>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    value={r.itemId}
                    onChange={(e) => setRow(idx, "itemId", e.target.value)}
                  >
                    <option value="">-- Add New Item --</option>
                    {itemsSorted.map((it: any) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">New Item Name</div>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. Copper Wire 12mm"
                    value={r.newName}
                    onChange={(e) => setRow(idx, "newName", e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
                  <input
                    type="number"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. 100"
                    value={r.qty}
                    onChange={(e) => setRow(idx, "qty", e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Price per Unit</div>
                  <input
                    type="number"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. 25.50"
                    value={r.price}
                    onChange={(e) => setRow(idx, "price", e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    value={r.unit}
                    onChange={(e) => setRow(idx, "unit", e.target.value)}
                  >
                    {UNITS.map((u) => (
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
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. 20"
                    value={r.reorderLevel}
                    onChange={(e) => setRow(idx, "reorderLevel", e.target.value)}
                  />
                </label>

                <label className="md:col-span-2 block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
                  <textarea
                    rows={2}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="Item details…"
                    value={r.description}
                    onChange={(e) => setRow(idx, "description", e.target.value)}
                  />
                </label>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                  >
                    Remove row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              + Add Item
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAll}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                Save Transaction
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Inward Entries</h2>
            <div className="text-sm text-gray-500">
              Total: {inwardEntries.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px] sm:min-w-0">
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-2">DATE</div>
                <div className="col-span-4">ITEM</div>
                <div className="col-span-2">QTY</div>
                <div className="col-span-2">UNIT</div>
                <div className="col-span-2">BILL NO.</div>
              </div>

              {inwardEntries.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-500">No inward entries yet.</div>
              ) : (
                <div className="divide-y">
                  {inwardEntries.map((m) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-12 px-4 py-3 text-sm items-center"
                    >
                      <div className="col-span-2 whitespace-nowrap">{fmtDate(m.date)}</div>
                      <div className="col-span-4 truncate">{m.itemName || "—"}</div>
                      <div className="col-span-2 whitespace-nowrap">{m.quantity}</div>
                      <div className="col-span-2 whitespace-nowrap">{m.unit || "—"}</div>
                      <div className="col-span-2 truncate">{m.meta?.billNo || "—"}</div>
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
