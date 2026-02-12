import React, { createContext, useContext, useEffect, useReducer } from "react";

/** ---------- Types ---------- */

export type MovementType = "INWARD" | "OUTWARD" | "RETURN";

export type StockMovement = {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  type: MovementType;
  date: string;      // ISO
  quantity: number;
  pricePerUnit?: number; // INWARD only
  note?: string;
  meta?: {
    purchaser?: string;
    billNo?: string;
    billDate?: string; // ISO
    toSite?: string;
    laborName?: string;
    workOrder?: string;
    scheme?: string;
    department?: string;
    issueToEmployee?: string;
    outwardKind?: "SITE" | "FACTORY";
  };
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  description?: string;
  openingStockDate?: string;
  reorderLevel?: number;
  purchasePrice: number; // avg cost
  currentStock: number;
  history?: string[];
};

export type ChallanItem = {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
};

export type DeliveryChallan = {
  id: string;
  number: string;
  date: string; // ISO
  mode: "SITE" | "FACTORY";
  items: ChallanItem[];
  meta?: StockMovement["meta"];
  createdAt: string; // ISO
};

export type State = {
  items: InventoryItem[];
  movements: StockMovement[];
  challans: DeliveryChallan[];
};

type InwardPayload = {
  item: {
    id: string;
    name: string;
    unit: string;
    description?: string;
    openingStockDate?: string;
    reorderLevel?: number;
    purchasePrice?: number;
  };
  movement: StockMovement; // type "INWARD"
};

type OutwardPayload = {
  itemId: string;
  quantity: number;
  movement: StockMovement; // type "OUTWARD"
};

type ReturnPayload = {
  itemId: string;
  quantity: number;
  movement: StockMovement; // type "RETURN"
};

type Action =
  | { type: "INWARD"; payload: InwardPayload }
  | { type: "OUTWARD"; payload: OutwardPayload }
  | { type: "RETURN"; payload: ReturnPayload }
  | { type: "ADD_CHALLAN"; payload: { challan: DeliveryChallan } }
  | { type: "UPDATE_ITEM"; payload: { id: string; patch: Partial<InventoryItem> } }
  | { type: "DELETE_ITEM"; payload: { id: string } };

/** ---------- Persistence ---------- */

const LS_KEY = "transfostock_v1";

function genId() {
  // robust id generator in-browser
  // @ts-ignore
  return (crypto?.randomUUID?.() as string) || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function loadInitial(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed: State = JSON.parse(raw);

      // Defensive defaults so old data continues to work
      let items = (parsed.items || []).map((it: any) => ({
        purchasePrice: 0,
        currentStock: 0,
        ...it,
      })) as InventoryItem[];

      // Ensure every item has an id (prevents accidental mass delete)
      items = items.map((it) => (it.id ? it : { ...it, id: genId() }));

      const movements = (parsed.movements || []) as StockMovement[];
      const challans = (parsed.challans || []) as DeliveryChallan[];

      return { items, movements, challans };
    }
  } catch {
    // ignore
  }
  return { items: [], movements: [], challans: [] };
}

/** ---------- Helpers ---------- */

function updateAverageCost(prevAvg: number, prevQty: number, addQty: number, addPrice?: number): number {
  const price = typeof addPrice === "number" ? addPrice : prevAvg;
  const totalCost = prevAvg * prevQty + price * addQty;
  const totalQty = prevQty + addQty;
  if (totalQty <= 0) return 0;
  return totalCost / totalQty;
}

function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

/** ---------- Reducer ---------- */

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INWARD": {
      const { item, movement } = action.payload;
      const qty = Math.max(0, Math.floor(movement.quantity || 0));

      const existing = state.items.find((i) => i.id === item.id);

      if (existing) {
        const newStock = (existing.currentStock || 0) + qty;
        const pricePerUnit =
          typeof movement.pricePerUnit === "number"
            ? movement.pricePerUnit
            : movement.meta?.pricePerUnit;
        const newAvg = updateAverageCost(
          existing.purchasePrice || 0,
          existing.currentStock || 0,
          qty,
          pricePerUnit
        );

        const updatedItem: InventoryItem = {
          ...existing,
          name: item.name ?? existing.name,
          unit: item.unit ?? existing.unit,
          description: item.description ?? existing.description,
          reorderLevel:
            typeof item.reorderLevel === "number" ? item.reorderLevel : existing.reorderLevel,
          openingStockDate: item.openingStockDate ?? existing.openingStockDate,
          currentStock: newStock,
          purchasePrice: newAvg,
        };

        const m: StockMovement = {
          ...movement,
          itemId: existing.id,
          itemName: updatedItem.name,
          unit: updatedItem.unit,
          type: "INWARD",
        };

        return {
          ...state,
          items: state.items.map((i) => (i.id === existing.id ? updatedItem : i)),
          movements: [...state.movements, m],
        };
      } else {
        const seedPrice =
          typeof movement.pricePerUnit === "number"
            ? movement.pricePerUnit
            : typeof movement.meta?.pricePerUnit === "number"
            ? movement.meta?.pricePerUnit
            : typeof item.purchasePrice === "number"
            ? item.purchasePrice
            : 0;

        const newItem: InventoryItem = {
          id: item.id || genId(),
          name: item.name,
          unit: item.unit,
          description: item.description,
          openingStockDate: item.openingStockDate,
          reorderLevel: item.reorderLevel ?? 0,
          currentStock: qty,
          purchasePrice: seedPrice,
        };

        const m: StockMovement = {
          ...movement,
          itemId: newItem.id,
          itemName: newItem.name,
          unit: newItem.unit,
          type: "INWARD",
        };

        return {
          ...state,
          items: [...state.items, newItem],
          movements: [...state.movements, m],
        };
      }
    }

    case "OUTWARD": {
      const { itemId, quantity, movement } = action.payload;
      const it = state.items.find((i) => i.id === itemId);
      if (!it) return state;

      const q = Math.max(0, Math.floor(quantity || 0));
      const newStock = clampNonNegative((it.currentStock || 0) - q);

      const updated: InventoryItem = { ...it, currentStock: newStock };
      const m: StockMovement = {
        ...movement,
        itemId: it.id,
        itemName: it.name,
        unit: it.unit,
        type: "OUTWARD",
      };

      return {
        ...state,
        items: state.items.map((i) => (i.id === it.id ? updated : i)),
        movements: [...state.movements, m],
      };
    }

    case "RETURN": {
      const { itemId, quantity, movement } = action.payload;
      const it = state.items.find((i) => i.id === itemId);
      if (!it) return state;

      const q = Math.max(0, Math.floor(quantity || 0));
      const newStock = (it.currentStock || 0) + q;

      const updated: InventoryItem = { ...it, currentStock: newStock };
      const m: StockMovement = {
        ...movement,
        itemId: it.id,
        itemName: it.name,
        unit: it.unit,
        type: "RETURN",
      };

      return {
        ...state,
        items: state.items.map((i) => (i.id === it.id ? updated : i)),
        movements: [...state.movements, m],
      };
    }

    case "ADD_CHALLAN": {
      const { challan } = action.payload;
      return {
        ...state,
        challans: [...state.challans, challan],
      };
    }

    case "UPDATE_ITEM": {
      const { id, patch } = action.payload;
      const exists = state.items.some((it) => it.id === id);
      if (!exists) return state;
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === id
            ? {
                ...it,
                name: patch.name ?? it.name,
                unit: patch.unit ?? it.unit,
                description: patch.description ?? it.description,
                reorderLevel:
                  typeof patch.reorderLevel === "number"
                    ? patch.reorderLevel
                    : it.reorderLevel,
                openingStockDate: patch.openingStockDate ?? it.openingStockDate,
                currentStock:
                  typeof patch.currentStock === "number" ? patch.currentStock : it.currentStock,
                purchasePrice:
                  typeof patch.purchasePrice === "number" ? patch.purchasePrice : it.purchasePrice,
              }
            : it
        ),
      };
    }

    case "DELETE_ITEM": {
      const { id } = action.payload;
      // Guard: only proceed if an item with this id exists
      const exists = state.items.some((it) => it.id === id);
      if (!exists) return state;

      const nextItems = state.items.filter((it) => it.id !== id);
      const nextMovs = state.movements.filter((m) => m.itemId !== id);

      return { ...state, items: nextItems, movements: nextMovs };
    }

    default:
      return state;
  }
}

/** ---------- Context ---------- */

type Ctx = { state: State; dispatch: React.Dispatch<Action> };
const InventoryContext = createContext<Ctx | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return (
    <InventoryContext.Provider value={{ state, dispatch }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): Ctx {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
