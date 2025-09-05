import React from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { state } = useInventory();
  return (
    <div className="pb-20">
      <Header title="Dashboard" />
      <div className="p-4 space-y-3">
        <Card>Total Items: {state.items.length}</Card>
        <Card>Total Stock: {state.items.reduce((a,b)=>a+b.currentStock,0)}</Card>
        <Link to="/overview" className="text-blue-600">View Stock</Link>
      </div>
    </div>
  );
}
