import React from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

export default function Reports(){
  const { state }=useInventory();
  return(<div className="pb-20"><Header title="Reports"/><div className="p-4 space-y-2">
    {state.items.map(i=><Card key={i.id}>{i.name} movements: {i.history.length}</Card>)}
  </div></div>);
}
