import React, { useMemo } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

const MAX_RECENT = 10;

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const { state } = useInventory();

  const totalItems = state.items.length;
  const lowAlerts = state.items.filter((i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? -1)).length;
  const inwardCount = state.movements.filter((m) => m.type === "INWARD" || m.type === "RETURN").length;
  const outwardCount = state.movements.filter((m) => m.type === "OUTWARD").length;

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

  return (
    <div className="pb-24">
      <Header title="Dashboard" />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <div className="text-gray-500 text-sm">Total Items</div>
            <div className="text-3xl font-semibold">{totalItems}</div>
          </Card>

          <Card>
            <div className="text-gray-500 text-sm">Low Stock Alerts</div>
            <div className="text-3xl font-semibold">{lowAlerts}</div>
          </Card>

          <Card>
            <div className="text-gray-500 text-sm">Inward Entries</div>
            <div className="text-3xl font-semibold">{inwardCount}</div>
          </Card>

          <Card>
            <div className="text-gray-500 text-sm">Outward Entries</div>
            <div className="text-3xl font-semibold">{outwardCount}</div>
          </Card>

          <Card>
            <div className="text-gray-500 text-sm">Last Updated</div>
            <div className="text-lg font-medium">
              {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : "—"}
            </div>
          </Card>
        </div>

        {/* Recent Inward / Return */}
        <Card>
          <h3 className="text-lg font-semibold mb-3">Recent Inward / Return</h3>
          {recentInward.length === 0 ? (
            <div className="text-gray-500">No recent entries.</div>
          ) : (
            <ul className="divide-y">
              {recentInward.map((mv, idx) => (
                <li key={idx} className="py-2 flex items-center justify-between">
                  <div className="truncate">
                    <span className="font-medium">{(mv as any).itemName || "Item"}</span>
                    <span className="text-gray-500 ml-2">
                      +{mv.quantity} ({mv.type === "RETURN" ? "Return" : "Inward"})
                    </span>
                    {mv.note && <span className="text-gray-400 ml-2">· {mv.note}</span>}
                  </div>
                  <div className="text-gray-500 text-sm">{formatDate(mv.date)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent Outward */}
        <Card>
          <h3 className="text-lg font-semibold mb-3">Recent Outward</h3>
          {recentOutward.length === 0 ? (
            <div className="text-gray-500">No recent entries.</div>
          ) : (
            <ul className="divide-y">
              {recentOutward.map((mv, idx) => (
                <li key={idx} className="py-2 flex items-center justify-between">
                  <div className="truncate">
                    <span className="font-medium">{(mv as any).itemName || "Item"}</span>
                    <span className="text-gray-500 ml-2">-{mv.quantity}</span>
                    {mv.note && <span className="text-gray-400 ml-2">· {mv.note}</span>}
                  </div>
                  <div className="text-gray-500 text-sm">{formatDate(mv.date)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
