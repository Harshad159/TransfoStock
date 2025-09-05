import React, { createContext, useContext, useEffect, useReducer } from "react";
import type { InventoryItem, StockMovement } from "../types";

type State = { items: InventoryItem[] };
type Action =
  | { type: "INWARD"; payload: { item: Omit<InventoryItem, "currentStock" | "history" | "deleteRequested">; movement: StockMovement } }
  | { type: "OUTWARD"; payload: { itemId: string; movement: StockMovement } };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}
const uuid = () => (crypto && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const initial: State = load<State>("transfostock:v1", { items: [] });

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INWARD": {
      const { item, movement } = action.payload;
      const items = [...state.items];
      const idx = items.findIndex((i) => i.name.trim().toLowerCase() === item.name.trim().toLowerCase());
      if (idx >= 0) {
        items[idx] = {
          ...items[idx],
          unit: item.unit,
          purchasePrice: item.purchasePrice,
          description: item.description,
          openingStockDate: item.openingStockDate,
          reorderLevel: item.reorderLevel,
          currentStock: items[idx].currentStock + movement.quantity,
          history: [...items[idx].history, movement],
        };
      } else {
        items.push({ ...item, id: uuid(), currentStock: movement.quantity, history: [movement] });
      }
      return { items };
    }
    case "OUTWARD": {
      const { itemId, movement } = action.payload;
      const items = state.items.map((i) =>
        i.id === itemId
          ? { ...i, currentStock: Math.max(0, i.currentStock - movement.quantity), history: [...i.history, movement] }
          : i
      );
      return { items };
    }
    default:
      return state;
  }
}

const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initial);
  useEffect(() => save("transfostock:v1", state), [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
};

export function useInventory() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
