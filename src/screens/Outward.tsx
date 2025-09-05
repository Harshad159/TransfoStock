import React,{useState} from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import NumberField from "../components/NumberField";
import { useInventory } from "../context/InventoryContext";

export default function Outward() {
  const { state, dispatch }=useInventory();
  const [itemId,setItemId]=useState(state.items[0]?.id||""); const [qty,setQty]=useState(0);
  function save(){ if(!itemId)return; dispatch({type:"OUTWARD",payload:{itemId,movement:{id:crypto.randomUUID(),type:"OUTWARD",date:new Date().toISOString(),quantity:qty}}}); setQty(0); }
  return(<div className="pb-20"><Header title="Outward"/><div className="p-4"><Card>
    <select value={itemId} onChange={e=>setItemId(e.target.value)} className="border p-2 w-full">
      {state.items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
    </select>
    <NumberField label="Quantity" value={qty} onChange={setQty}/>
    <button onClick={save} className="bg-blue-600 text-white px-4 py-2">Save</button>
  </Card></div></div>);
}
