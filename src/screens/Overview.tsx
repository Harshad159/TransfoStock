import React from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Overview() {
  const { state }=useInventory();
  return(<div className="pb-20"><Header title="Stock Overview"/><div className="p-4 space-y-2">
    {state.items.map(i=><Card key={i.id}>{i.name}: {i.currentStock} {i.unit}</Card>)}
  </div></div>);
}
