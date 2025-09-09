import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

type Mode = "SITE" | "FACTORY";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Outward() {
  const { state, dispatch } = useInventory();

  // UI state
  const [mode, setMode] = useState<Mode>("SITE");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState<string>(""); // empty -> no leading zero
  const [date, setDate] = useState<string>(todayISO());

  // Site fields
  const [toSite, setToSite] = useState("");
  const [labor, setLabor] = useState("");
  const [workOrder, setWorkOrder] = useState("");
  const [scheme, setScheme] = useState("");

  // Factory fields
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");

  // Convenience: sorted items for dropdown
  const items = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );
  const selected = items.find((i) => i.id === itemId);
  const currentStock = selected?.currentStock ?? 0;

  function reset() {
    setItemId("");
    setQty("");
    setDate(todayISO());
    setToSite("");
    setLabor("");
    setWorkOrder("");
    setScheme("");
    setDepartment("");
    setEmployee("");
  }

  function buildNote(): string {
    if (mode === "SITE") {
      const parts = ["Site Issue"];
      if (toSite) parts.push(`Given To: ${toSite}`);
      if (labor) parts.push(`Labor: ${labor}`);
      if (workOrder) parts.push(`WO: ${workOrder}`);
      if (scheme) parts.push(`Scheme: ${scheme}`);
      return parts.join(" | ");
    } else {
      const parts = ["Factory Issue"];
      if (department) parts.push(`Dept: ${department}`);
      if (employee) parts.push(`Employee: ${employee}`);
      return parts.join(" | ");
    }
  }

  function save() {
    if (!itemId) return alert("Please select an item.");
    const nQty = Number(qty || "0");
    if (!Number.isFinite(nQty) || nQty <= 0) return alert("Quantity must be greater than 0.");

    // Stock guard
    if (nQty > currentStock) {
      return alert(`Only ${currentStock} ${selected?.unit || ""} in stock.`);
    }

    // Compose movement
    const movement = {
      id: (crypto as any)?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      itemId,
      itemName: selected?.name || "",
      unit: selected?.unit || "",
      type: "OUTWARD" as const,
      date: new Date(date).toISOString(),
      quantity: nQty,
      note: buildNote(),
      meta:
        mode === "SITE"
          ? {
              outwardKind: "SITE" as const,
              toSite: toSite || undefined,
              laborName: labor || undefined,
              workOrder: workOrder || undefined,
              scheme: scheme || undefined,
            }
          : {
              outwardKind: "FACTORY" as const,
              department: department || undefined,
              issueToEmployee: employee || undefined,
            },
    };

    // Dispatch correct action shape (InventoryContext reducer expects this)
    dispatch({
      type: "OUTWARD",
      payload: {
        itemId,
        quantity: nQty,
        movement,
      },
    });

    alert("Outward saved ✅");
    reset();
  }

  return (
    <div className="pb-24">
      <Header title="Outward Entry" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Outward Entry</h2>
            <p className="text-gray-500 text-sm">Issue material to Site or Factory.</p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode("SITE")}
              className={
                "px-3 py-1 rounded-lg border " +
                (mode === "SITE"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300")
              }
            >
              Site Material Issued
            </button>
            <button
              type="button"
              onClick={() => setMode("FACTORY")}
              className={
                "px-3 py-1 rounded-lg border " +
                (mode === "FACTORY"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300")
              }
            >
              Factory Material Issued
            </button>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Item</div>
              <select
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
                <option value="">-- Select Item --</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              {!!selected && (
                <div className="text-xs text-gray-500 mt-1">
                  Current Stock: <b>{currentStock}</b> {selected.unit}
                </div>
              )}
            </label>

            {/* Quantity */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
              <input
                type="number"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                placeholder="e.g. 10"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                min={0}
              />
            </label>

            {/* Date */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            {/* Unit (read-only) */}
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Unit</div>
              <input
                disabled
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={selected?.unit || ""}
                placeholder="—"
              />
            </label>

            {mode === "SITE" ? (
              <>
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Given To (Site)</div>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. TALNI"
                    value={toSite}
                    onChange={(e) => setToSite(e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Labor</div>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. NANDI"
                    value={labor}
                    onChange={(e) => setLabor(e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Work Order (WO)</div>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. 44"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Scheme</div>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. IPDS"
                    value={scheme}
                    onChange={(e) => setScheme(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Department / Issue To</div>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. Winding"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700 mb-1">Issue To Employee</div>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                    placeholder="e.g. Jane Doe"
                    value={employee}
                    onChange={(e) => setEmployee(e.target.value)}
                  />
                </label>
              </>
            )}
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
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
              type="button"
              onClick={save}
            >
              Save Outward
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
