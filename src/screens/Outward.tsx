import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

type Mode = "SITE" | "FACTORY";

type LineItem = {
  id: string;
  itemId: string;
  qty: string; // keep as string to avoid leading zero issues; parse on save
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

  const [mode, setMode] = useState<Mode>("SITE");
  const [date, setDate] = useState<string>(todayISO());

  // Shared meta (applies to all lines in this outward batch)
  // ---- Site meta
  const [toSite, setToSite] = useState("");
  const [labor, setLabor] = useState("");
  const [workOrder, setWorkOrder] = useState("");
  const [scheme, setScheme] = useState("");
  const [deliveryChallan, setDeliveryChallan] = useState("");
  // ---- Factory meta
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");

  // Multiple line items
  const [lines, setLines] = useState<LineItem[]>([
    { id: crypto.randomUUID(), itemId: "", qty: "" },
  ]);

  // Items sorted for dropdowns
  const items = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), itemId: "", qty: "" }]);
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }
  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function reset() {
    setDate(todayISO());
    setToSite("");
    setLabor("");
    setWorkOrder("");
    setScheme("");
    setDeliveryChallan("");
    setDepartment("");
    setEmployee("");
    setLines([{ id: crypto.randomUUID(), itemId: "", qty: "" }]);
  }

  function save() {
    // Basic validation
    const errors: string[] = [];
    const prepared: Array<{
      itemId: string;
      itemName: string;
      unit: string;
      qty: number;
      currentStock: number;
    }> = [];

    if (lines.length === 0) {
      errors.push("Please add at least one item.");
    }

    for (const [idx, ln] of lines.entries()) {
      const rowNo = idx + 1;
      if (!ln.itemId) {
        errors.push(`Row ${rowNo}: Select an item.`);
        continue;
      }
      const item = items.find((i) => i.id === ln.itemId);
      if (!item) {
        errors.push(`Row ${rowNo}: Invalid item.`);
        continue;
      }
      const nQty = Number(ln.qty || "0");
      if (!Number.isFinite(nQty) || nQty <= 0) {
        errors.push(`Row ${rowNo}: Quantity must be greater than 0.`);
        continue;
      }
      const stock = item.currentStock ?? 0;
      if (nQty > stock) {
        errors.push(
          `Row ${rowNo}: "${item.name}" has only ${stock} ${item.unit || ""} in stock.`
        );
        continue;
      }

      prepared.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit || "",
        qty: nQty,
        currentStock: stock,
      });
    }

    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }

    // Dispatch one OUTWARD movement per prepared line
    const commonMeta =
      mode === "SITE"
        ? {
            outwardKind: "SITE" as const,
            toSite: toSite || undefined,
            laborName: labor || undefined,
            workOrder: workOrder || undefined,
            scheme: scheme || undefined,
            deliveryChallan: deliveryChallan || undefined,
          }
        : {
            outwardKind: "FACTORY" as const,
            department: department || undefined,
            issueToEmployee: employee || undefined,
          };

    for (const p of prepared) {
      const movement = {
        id:
          (crypto as any)?.randomUUID?.() ||
          `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        itemId: p.itemId,
        itemName: p.itemName,
        unit: p.unit,
        type: "OUTWARD" as const,
        date: new Date(date).toISOString(),
        quantity: p.qty,
        note:
          mode === "SITE"
            ? [
                "Site Issue",
                toSite ? `Given To: ${toSite}` : null,
                labor ? `Labor: ${labor}` : null,
                workOrder ? `WO: ${workOrder}` : null,
                scheme ? `Scheme: ${scheme}` : null,
                deliveryChallan ? `Delivery Challan: ${deliveryChallan}` : null,
              ]
                .filter(Boolean)
                .join(" | ")
            : [
                "Factory Issue",
                department ? `Dept: ${department}` : null,
                employee ? `Employee: ${employee}` : null,
              ]
                .filter(Boolean)
                .join(" | "),
        meta: commonMeta,
      };

      dispatch({
        type: "OUTWARD",
        payload: {
          itemId: p.itemId,
          quantity: p.qty,
          movement,
        },
      });
    }

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
            <p className="text-gray-500 text-sm">
              Issue multiple items to Site or Factory in one go.
            </p>
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

          {/* Shared date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>

          {/* Mode-specific meta (shared across lines) */}
          {mode === "SITE" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  placeholder="e.g. WO-44"
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

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-gray-700 mb-1">Delivery Challan No.</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. DC-12345"
                  value={deliveryChallan}
                  onChange={(e) => setDeliveryChallan(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            </div>
          )}

          {/* Lines table */}
          <div className="overflow-x-auto">
            <div className="min-w-[860px] sm:min-w-0">
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-5">ITEM</div>
                <div className="col-span-2">UNIT</div>
                <div className="col-span-2">CURRENT STOCK</div>
                <div className="col-span-2">QTY</div>
                <div className="col-span-1 text-center">ACTION</div>
              </div>

              <div className="divide-y">
                {lines.map((ln, idx) => {
                  const item = items.find((i) => i.id === ln.itemId);
                  const unit = item?.unit || "";
                  const stock = item?.currentStock ?? 0;

                  return (
                    <div
                      key={ln.id}
                      className="grid grid-cols-12 px-4 py-3 items-center text-sm"
                    >
                      {/* ITEM */}
                      <div className="col-span-5">
                        <select
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          value={ln.itemId}
                          onChange={(e) => updateLine(ln.id, { itemId: e.target.value })}
                        >
                          <option value="">-- Select Item --</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* UNIT (read-only) */}
                      <div className="col-span-2">
                        <input
                          disabled
                          className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          value={unit}
                          placeholder="—"
                        />
                      </div>

                      {/* CURRENT STOCK (read-only) */}
                      <div className="col-span-2">
                        <input
                          disabled
                          className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          value={ln.itemId ? String(stock) : ""}
                          placeholder="—"
                        />
                      </div>

                      {/* QTY */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          placeholder="e.g. 10"
                          value={ln.qty}
                          onChange={(e) => updateLine(ln.id, { qty: e.target.value })}
                          min={0}
                        />
                      </div>

                      {/* ACTION */}
                      <div className="col-span-1 flex justify-center">
                        {lines.length > 1 ? (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => removeLine(ln.id)}
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-3">
                <button
                  type="button"
                  className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800"
                  onClick={addLine}
                >
                  + Add another item
                </button>
              </div>
            </div>
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
