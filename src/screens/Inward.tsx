import React, { useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import TextField from "../components/TextField";
import NumberField from "../components/NumberField";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement, Unit } from "../types";

export default function Inward() {
  const { dispatch } = useInventory();
  const [name,setName]=useState(""); const [unit,setUnit]=useState<Unit>("Nos"); const [qty,setQty]=useState(0);
  function save() {
    if(!name||qty<=0)return;
    const item: Omit<InventoryItem,"currentStock"|"history"|"deleteRequested">={id:crypto.randomUUID(),name,unit,purchasePrice:0,reorderLevel:0};
    const move: StockMovement={id:crypto.randomUUID(),type:"INWARD",date:new Date().toISOString(),quantity:qty};
    dispatch({type:"INWARD",payload:{item,movement:move}}); setName(""); setQty(0);
  }
  return (
    <div className="pb-20">
      <Header title="Inward" />
      <div className="p-4"><Card>
        <TextField label="Item Name" value={name} onChange={setName}/>
        <NumberField label="Quantity" value={qty} onChange={setQty}/>
        <button onClick={save} className="bg-blue-600 text-white px-4 py-2">Save</button>
      </Card></div>
    </div>
  );
}
