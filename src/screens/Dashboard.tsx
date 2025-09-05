import React, { useMemo } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import { Link } from "react-router-dom";

type Kind = "INWARD" | "OUTWARD" | "RETURN";

const iconWrap =
  "h-9 w-9 rounded-full flex items-center justify-center mr-3 shadow-sm";
const statCard =
  "flex items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm";

export default function Dashboard() {
  const { state } = useInventory();
  const items = state.items;

  const totalItems = items.length;

  const lowStock = useMemo(
    () => items.filter((i) => i.currentStock <= i.reorderLevel),
    [items]
  );

  const counts = useMemo(() => {
    let inward = 0,
      outward = 0,
      ret = 0;
    for (const i of items) {
      for (const h of i.history) {
        if (h.type === "INWARD") inward++;
        else if (h.type === "OUTWARD") outward++;
        else if (h.type === "RETURN") ret++;
      }
    }
    return { inward, outward, ret };
  }, [items]);

  const recent = useMemo(() => {
    const all = items.flatMap((i) =>
      i.history.map((h) => ({ itemName: i.name, ...h }))
    );
    all.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    const inwardReturn = all.filter(
      (h) => h.type === "INWARD" || h.type === "RETURN"
    );
    const outward = all.filter((h) => h.type === "OUTWARD");
    return {
      inwardReturn: inwardReturn.slice(0, 5),
      outward: outward.slice(0, 5),
    };
  }, [items]);

  const Stat = ({
    color,
    bg,
    icon,
    label,
    value,
  }: {
    color: string;
    bg: string;
    icon: React.ReactNode;
    label: string;
    value: number;
  }) => (
    <div className={statCard}>
      <div className={`${iconWrap} ${bg} text-${color}`}>
        <span className="text-lg">{icon}</span>
      </div>
      <div>
        <div className="text-gray-600 text-sm">{label}</div>
        <div className="text-3xl font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );

  const Row = ({
    title,
    icon,
    tint,
    children,
  }: {
    title: string;
    icon: React.ReactNode;
    tint: string; // e.g. "text-green-600"
    children: React.ReactNode;
  }) => (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center">
        <span className={`mr-2 ${tint}`}>{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  const MovementLine = ({
    itemName,
    type,
    date,
    qty,
  }: {
    itemName: string;
    type: Kind;
    date: string;
    qty: number;
  }) => {
    const fmt = new Date(date).toLocaleString();
    const color =
      type === "INWARD"
        ? "text-green-600"
        : type === "OUTWARD"
        ? "text-orange-500"
        : "text-blue-600";
    const badge =
      type === "INWARD"
        ? "bg-green-50 text-green-700"
        : type === "OUTWARD"
        ? "bg-orange-50 text-orange-700"
        : "bg-blue-50 text-blue-700";
    const sign = type === "OUTWARD" ? "-" : "+";
    return (
      <div className="flex items-center justify-between py-1.5">
        <div className="truncate">
          <span className={`mr-2 text-sm ${badge} px-2 py-0.5 rounded-full`}>
            {type}
          </span>
          <span className="font-medium">{itemName}</span>
          <span className="text-gray-500 text-sm ml-2">{fmt}</span>
        </div>
        <div className={`ml-3 font-semibold ${color}`}>
          {sign}
          {qty}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20">
      <Header title="Dashboard" />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <Stat
            color="blue-600"
            bg="bg-blue-50"
            icon={<span className="material-icons">menu</span>}
            label="Total Items"
            value={totalItems}
          />
          <Stat
            color="rose-600"
            bg="bg-rose-50"
            icon={<span className="material-icons">warning</span>}
            label="Low Stock Alerts"
            value={lowStock.length}
          />
          <Stat
            color="green-600"
            bg="bg-green-50"
            icon={<span className="material-icons">login</span>}
            label="Inward Entries"
            value={counts.inward}
          />
          <Stat
            color="orange-500"
            bg="bg-orange-50"
            icon={<span className="material-icons">info</span>}
            label="Outward Entries"
            value={counts.outward}
          />
          <Stat
            color="blue-600"
            bg="bg-blue-50"
            icon={<span className="material-icons">undo</span>}
            label="Return Entries"
            value={counts.ret}
          />
        </div>

        {/* Recent Inward/Return */}
        <Row title="Recent Inward/Return" icon={"🟢"} tint="text-green-600">
          {recent.inwardReturn.length === 0 ? (
            <div className="text-gray-500">No recent entries.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.inwardReturn.map((h) => (
                <MovementLine
                  key={h.id}
                  itemName={h.itemName}
                  type={h.type as Kind}
                  date={h.date}
                  qty={h.quantity}
                />
              ))}
            </div>
          )}
        </Row>

        {/* Recent Outward */}
        <Row title="Recent Outward" icon={"🟠"} tint="text-orange-500">
          {recent.outward.length === 0 ? (
            <div className="text-gray-500">No recent entries.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.outward.map((h) => (
                <MovementLine
                  key={h.id}
                  itemName={h.itemName}
                  type={h.type as Kind}
                  date={h.date}
                  qty={h.quantity}
                />
              ))}
            </div>
          )}
        </Row>

        {/* Quick action buttons (optional) */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <Link
            to="/inward"
            className="block text-center bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium shadow-sm"
          >
            + Inward
          </Link>
          <Link
            to="/outward"
            className="block text-center bg-orange-400 hover:bg-orange-500 text-white py-3 rounded-xl font-medium shadow-sm"
          >
            – Outward
          </Link>
        </div>
      </div>
    </div>
  );
}
