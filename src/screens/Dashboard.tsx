import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

const MAX_RECENT = 10;

function fmtShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export default function Dashboard() {
  const nav = useNavigate();
  const { state } = useInventory();

  // --- quick look numbers ---
  const totalItems = state.items.length;
  const lowAlerts = state.items.filter(
    (i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? -1)
  ).length;
  const inwardEntries = state.movements.filter(
    (m) => m.type === "INWARD" || m.type === "RETURN"
  ).length;
  const outwardEntries = state.movements.filter(
    (m) => m.type === "OUTWARD"
  ).length;
  const returnEntries = state.movements.filter(
    (m) => m.type === "RETURN"
  ).length;

  // --- recent lists (10) ---
  const recentInward = useMemo(
    () =>
      state.movements
        .filter((m) => m.type === "INWARD" || m.type === "RETURN")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_RECENT),
    [state.movements]
  );

  const recentOutward = useMemo(
    () =>
      state.movements
        .filter((m) => m.type === "OUTWARD")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_RECENT),
    [state.movements]
  );

  // helper to show unit at right side
  function unitFor(itemId?: string): string {
    if (!itemId) return "";
    const it = state.items.find((i) => i.id === itemId);
    return it?.unit || "";
  }

  return (
    <div className="pb-24">
      <Header title="Dashboard" />

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Top action bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => nav("/inward")}
            className="w-full rounded-2xl bg-green-500 hover:bg-green-600 text-white text-lg font-semibold px-6 py-5 flex items-center gap-3 shadow-sm"
          >
            <span className="material-icons text-white">login</span>
            + Inward
          </button>
          <button
            onClick={() => nav("/outward")}
            className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold px-6 py-5 flex items-center gap-3 shadow-sm"
          >
            <span className="material-icons text-white">logout</span>
            - Outward
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="material-icons text-blue-600 bg-blue-50 p-2 rounded-full">
                menu
              </span>
              <div>
                <div className="text-gray-500 text-sm">Total Items</div>
                <div className="text-3xl font-semibold">{totalItems}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="material-icons text-rose-600 bg-rose-50 p-2 rounded-full">
                report_problem
              </span>
              <div>
                <div className="text-gray-500 text-sm">Low Stock Alerts</div>
                <div className="text-3xl font-semibold">{lowAlerts}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="material-icons text-green-600 bg-green-50 p-2 rounded-full">
                login
              </span>
              <div>
                <div className="text-gray-500 text-sm">Inward Entries</div>
                <div className="text-3xl font-semibold">{inwardEntries}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="material-icons text-orange-600 bg-orange-50 p-2 rounded-full">
                logout
              </span>
              <div>
                <div className="text-gray-500 text-sm">Outward Entries</div>
                <div className="text-3xl font-semibold">{outwardEntries}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="material-icons text-indigo-600 bg-indigo-50 p-2 rounded-full">
                undo
              </span>
              <div>
                <div className="text-gray-500 text-sm">Return Entries</div>
                <div className="text-3xl font-semibold">{returnEntries}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Inward / Return */}
        <Card>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="material-icons text-green-600">login</span>
            Recent Inward/Return
          </h3>

          {recentInward.length === 0 ? (
            <div className="text-gray-500">No recent entries.</div>
          ) : (
            <ul className="divide-y">
              {recentInward.map((mv, idx) => (
                <li key={idx} className="py-3 flex items-center justify-between">
                  <div className="truncate">
                    <div className="font-medium">
                      {(mv as any).itemName || "—"}
                    </div>
                    <div className="text-gray-500 text-sm">{fmtShortDate(mv.date)}</div>
                  </div>
                  <div className="text-gray-900 font-semibold whitespace-nowrap">
                    {mv.quantity} {unitFor((mv as any).itemId)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent Outward */}
        <Card>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="material-icons text-orange-600">logout</span>
            Recent Outward
          </h3>

          {recentOutward.length === 0 ? (
            <div className="text-gray-500">No recent entries.</div>
          ) : (
            <ul className="divide-y">
              {recentOutward.map((mv, idx) => (
                <li key={idx} className="py-3 flex items-center justify-between">
                  <div className="truncate">
                    <div className="font-medium">
                      {(mv as any).itemName || "—"}
                    </div>
                    <div className="text-gray-500 text-sm">{fmtShortDate(mv.date)}</div>
                  </div>
                  <div className="text-gray-900 font-semibold whitespace-nowrap">
                    {mv.quantity} {unitFor((mv as any).itemId)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
