import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement } from "../types";

type OutwardKind = "factory" | "site";

type PendingRow = {
  itemId: string;
  unit: string;
  qty: string; // keep as string for clean typing
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Outward() {
  const { state, dispatch } = useInventory();
  const items = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  // step: choose outward kind
  const [kind, setKind] = useState<OutwardKind | null>(null);

  // shared editor (Items to Issue)
  const [itemId, setItemId] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [qty, setQty] = useState<string>(""); // empty by default
  const [pending, setPending] = useState<PendingRow[]>([]);

  // factory form
  const [fDate, setFDate] = useState<string>(todayISO());
  const [fDept, setFDept] = useState<string>("");
  const [fIssuedTo, setFIssuedTo] = useState<string>("");

  // site form
  const [sDate, setSDate] = useState<string>(todayISO());
  const [sGivenTo, setSGivenTo] = useState<string>("");
  const [sWorkOrder, setSWorkOrder] = useState<string>("");
  const [sLabor, setSLabor] = useState<string>("");
  const [sScheme, setSScheme] = useState<string>("");

  function resetEditor() {
    setItemId("");
    setUnit("");
    setQty("");
  }

  function resetAll() {
    setKind(null);
    setPending([]);
    resetEditor();
    setFDate(todayISO());
    setFDept("");
    setFIssuedTo("");
    setSDate(todayISO());
    setSGivenTo("");
    setSWorkOrder("");
    setSLabor("");
    setSScheme("");
  }

  function addRow() {
    if (!itemId) return alert("Please select an item.");
    if (!qty || parseFloat(qty) <= 0) return alert("Quantity must be greater than 0.");
    setPending((p) => [...p, { itemId, unit, qty }]);
    resetEditor();
  }

  function removeRow(i: number) {
    setPending((p) => p.filter((_, idx) => idx !== i));
  }

  function saveTransaction() {
    const rows = pending.length
      ? pending
      : (() => {
          if (!itemId) {
            alert("Add at least one item.");
            return [];
          }
          if (!qty || parseFloat(qty) <= 0) {
            alert("Quantity must be greater than 0.");
            return [];
          }
          return [{ itemId, unit, qty }];
        })();

    if (!rows.length) return;

    const isFactory = kind === "factory";
    const metaNote = isFactory
      ? `Factory Issue | Dept: ${fDept || "-"} | Issued To: ${fIssuedTo || "-"}`
      : `Site Issue | Given To: ${sGivenTo || "-"} | Work Order: ${sWorkOrder || "-"} | Labor: ${sLabor || "-"} | Scheme: ${sScheme || "-"}`;

    const txDate = isFactory ? fDate : sDate;

    for (const r of rows) {
      const base = state.items.find((i) => i.id === r.itemId);
      if (!base) continue;

      const movement: StockMovement = {
        id: crypto.randomUUID(),
        type: "OUTWARD",
        date: new Date(txDate).toISOString(),
        quantity: parseFloat(r.qty),
        note: metaNote,
      };

      const baseItem: Omit<InventoryItem, "currentStock" | "history" | "deleteRequested"> = {
        id: base.id,
        name: base.name,
        unit: base.unit,
        purchasePrice: base.purchasePrice || 0,
        description: base.description,
        openingStockDate: base.openingStockDate,
        reorderLevel: base.reorderLevel || 0,
      };

      dispatch({ type: "OUTWARD", payload: { item: baseItem, movement } });
    }

    alert("Outward transaction saved ✅");
    resetAll();
  }

  return (
    <div className="pb-28">
      <Header title={kind ? (kind === "factory" ? "Factory Outward Entry" : "Site Outward Entry") : "Outward"} />

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* STEP 1: Picker */}
        {!kind && (
          <Card>
            <div className="mb-3">
              <h2 className="text-xl font-semibold">Select Outward Entry Type</h2>
              <p className="text-gray-500 text-sm">Choose where materials are being issued.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                className="rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-6 py-8 text-center shadow-sm"
                onClick={() => setKind("factory")}
              >
                <div className="text-blue-700 text-3xl font-bold mb-2">Factory</div>
                <div className="text-gray-700">Issue materials for internal factory use.</div>
              </button>
              <button
                className="rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100 px-6 py-8 text-center shadow-sm"
                onClick={() => setKind("site")}
              >
                <div className="text-orange-600 text-3xl font-bold mb-2">Site</div>
                <div className="text-gray-700">Issue materials to a work site.</div>
              </button>
            </div>
          </Card>
        )}

        {/* STEP 2: Forms */}
        {kind === "factory" && (
          <>
            <Card>
              <h2 className="text-xl font-semibold mb-2">Factory Outward Entry</h2>
              <p className="text-gray-500 text-sm mb-4">Issue materials for internal factory use.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
                  <input
                    type="date"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Department</div>
                  <input
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. Winding Dept"
                    value={fDept}
                    onChange={(e) => setFDept(e.target.value)}
                  />
                </label>
                <label className="block md:col-span-2">
                  <div className="text-sm font-medium text-gray-700 mb-1">Issued To (Employee)</div>
                  <input
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. Jane Smith"
                    value={fIssuedTo}
                    onChange={(e) => setFIssuedTo(e.target.value)}
                  />
                </label>
              </div>
            </Card>

            <ItemsToIssue
              items={items}
              itemId={itemId}
              setItemId={(v) => {
                setItemId(v);
                const found = state.items.find((i) => i.id === v);
                setUnit(found?.unit || "");
              }}
              unit={unit}
              qty={qty}
              setQty={setQty}
              pending={pending}
              addRow={addRow}
              removeRow={removeRow}
            />

            <div className="flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={resetAll}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={saveTransaction}
                type="button"
              >
                Save Transaction
              </button>
            </div>
          </>
        )}

        {kind === "site" && (
          <>
            <Card>
              <h2 className="text-xl font-semibold mb-2">Site Outward Entry</h2>
              <p className="text-gray-500 text-sm mb-4">Issue materials to a work site.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
                  <input
                    type="date"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    value={sDate}
                    onChange={(e) => setSDate(e.target.value)}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Given To (Site/Dept)</div>
                  <input
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. Site A"
                    value={sGivenTo}
                    onChange={(e) => setSGivenTo(e.target.value)}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Labor Name</div>
                  <input
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. John Doe"
                    value={sLabor}
                    onChange={(e) => setSLabor(e.target.value)}
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Work Order No.</div>
                  <input
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. WO-2024-001"
                    value={sWorkOrder}
                    onChange={(e) => setSWorkOrder(e.target.value)}
                  />
                </label>
                <label className="block md:col-span-2">
                  <div className="text-sm font-medium text-gray-700 mb-1">Scheme</div>
                  <input
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. IPDS Scheme"
                    value={sScheme}
                    onChange={(e) => setSScheme(e.target.value)}
                  />
                </label>
              </div>
            </Card>

            <ItemsToIssue
              items={items}
              itemId={itemId}
              setItemId={(v) => {
                setItemId(v);
                const found = state.items.find((i) => i.id === v);
                setUnit(found?.unit || "");
              }}
              unit={unit}
              qty={qty}
              setQty={setQty}
              pending={pending}
              addRow={addRow}
              removeRow={removeRow}
            />

            <div className="flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={resetAll}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
                onClick={saveTransaction}
                type="button"
              >
                Save Transaction
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Items to Issue block (shared by factory & site) */
function ItemsToIssue(props: {
  items: InventoryItem[];
  itemId: string;
  setItemId: (v: string) => void;
  unit: string;
  qty: string;
  setQty: (v: string) => void;
  pending: PendingRow[];
  addRow: () => void;
  removeRow: (i: number) => void;
}) {
  const { items, itemId, setItemId, unit, qty, setQty, pending, addRow, removeRow } =
    props;

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-3">Items to Issue</h3>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Item select (span 6) */}
        <label className="block md:col-span-6">
          <div className="text-sm font-medium text-gray-700 mb-1">Item</div>
          <select
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">Select an item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>

        {/* Unit (span 2, readonly) */}
        <label className="block md:col-span-2">
          <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
          <input
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 outline-none"
            value={unit}
            readOnly
            placeholder="—"
          />
        </label>

        {/* Quantity (span 3) */}
        <label className="block md:col-span-3">
          <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
          <input
            type="number"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
            placeholder="e.g. 10"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>

        {/* Add button (span 1) */}
        <div className="md:col-span-1">
          <button
            type="button"
            onClick={addRow}
            className="w-full h-[42px] inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            title="Add item"
          >
            <span className="material-icons">add</span>
          </button>
        </div>
      </div>

      {/* pending list */}
      {pending.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <ul className="divide-y">
            {pending.map((p, idx) => (
              <li key={idx} className="py-2 flex items-center justify-between">
                <div className="truncate">
                  <span className="font-medium">
                    {items.find((i) => i.id === p.itemId)?.name || "—"}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {p.qty} {p.unit}
                  </span>
                </div>
                <button
                  className="text-red-600 text-sm"
                  onClick={() => removeRow(idx)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
