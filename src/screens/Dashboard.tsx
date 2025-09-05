import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Dashboard() {
  const { state } = useInventory();

  const totalItems = state.items.length;
  const totalStock = state.items.reduce((a, b) => a + b.currentStock, 0);
  const lowStock = state.items.filter(
    (i) => i.currentStock <= i.reorderLevel
  );

  return (
    <div className="pb-20">
      <Header title="Dashboard" />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Total Items & Stock */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="text-gray-600 text-sm">Total Items</div>
            <div className="text-3xl font-semibold">{totalItems}</div>
          </Card>
          <Card>
            <div className="text-gray-600 text-sm">Total Stock</div>
            <div className="text-3xl font-semibold">{totalStock}</div>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <Card>
          <div className="font-semibold mb-2">Low Stock Alerts</div>
          {lowStock.length === 0 ? (
            <div className="text-gray-600">✅ All items above reorder level</div>
          ) : (
            <ul className="space-y-1">
              {lowStock.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.name}</span>
                  <span className="text-red-600 font-medium">
                    {i.currentStock} (≤ {i.reorderLevel})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/inward"
            className="block text-center bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium"
          >
            + Inward
          </Link>
          <Link
            to="/outward"
            className="block text-center bg-orange-400 hover:bg-orange-500 text-white py-3 rounded-lg font-medium"
          >
            – Outward
          </Link>
        </div>
      </div>
    </div>
  );
}
