import React, { createContext, useContext, useEffect, useReducer } from "react";

/** ---------- Types ---------- */

export type MovementType = "INWARD" | "OUTWARD" | "RETURN";

export type StockMovement = {
  id: string;
  itemId: string;
  itemName: string; // snapshot for faster reports
  unit: string;     // snapshot for faster reports
  type: MovementType;
  date: string;     // ISO datetime (when movement happened)
  quantity: number;
  pricePerUnit?: number; // only for INWARD (used for avg cost)
  note?: string;

  // Optional structured metadata for reports/exports.
  // We keep these optional so existing data continues to load fine.
  meta?: {
    // Inward bill info
    purchaser?: string;
    billNo?: string;
    billDate?: string; // ISO

    // Outward site issue
    toSite?: string;
    laborName?: string;
    workOrder?: string;
    scheme?: string;

    // Outward factory issue
    department?: string;
    issueToEmployee?: string;

    // If you tag outward kind in the UI, set one of these:
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

  /** running average cost of the item */
  purchasePrice: number;

  /** live stock on hand */
  currentStock: number;

  /** optional local history pointer; not required by UI */
  history?: string[];
};

export type State = {
  items: InventoryItem[];
  movements: StockMovement[];
};

type InwardPayload = {
  item: {
    id: string;
    name: string;
    unit: string;
    description?: string;
    openingStockDate?: string;
    reorderLevel?: number;
    purchasePrice?: number; // optional seed
  };
  movement: StockMovement; // expect type "INWARD" with pricePerUnit if you want avg-cost update
};

type OutwardPayload = {
  itemId: string;
  quantity: number;
  movement: StockMovement; // expect type "OUTWARD"
};

type ReturnPayload = {
  itemId: string;
  quantity: number;
  movement: StockMovement; // expect type "RETURN"
};

type Action =
  | { type: "INWARD"; payload: InwardPayload }
  | { type: "OUTWARD"; payload: OutwardPayload }
  | { type: "RETURN"; payload: ReturnPayload }
  // NEW:
  | { type: "UPDATE_ITEM"; payload: { id: string; patch: Partial<InventoryItem> } }
  | { type: "DELETE_ITEM"; payload: { id: string } };

/** ---------- Persistence ---------- */

const LS_KEY = "transfostock_v1";

function loadInitial(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed: State = JSON.parse(raw);

      // defensive defaults so old data continues to work
      parsed.items = (parsed.items || []).map((it) => ({
        purchasePrice: 0,
        currentStock: 0,
        ...it,
      }));
      parsed.movements = parsed.movements || [];
      return parsed;
    }
  } catch {
    // ignore
  }
  return { items: [], movements: [] };
}

/** ---------- Helpers ---------- */

/** Weighted-average cost update */
function updateAverageCost(
  prevAvg: number,
  prevQty: number,
  addQty: number,
  addPrice?: number
): number {
  const price = typeof addPrice === "number" ? addPrice : prevAvg;
  const totalCost = prevAvg * prevQty + price * addQty;
  const totalQty = prevQty + addQty;
  if (totalQty <= 0) return 0;
  return totalCost / totalQty;
}

/** clamp to avoid negative stock */
function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

/** ---------- Reducer ---------- */

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INWARD": {
      const { item, movement } = action.payload;
      const qty = Math.max(0, Math.floor(movement.quantity || 0));

      // Does the item already exist?
      const existing = state.items.find((i) => i.id === item.id);

      if (existing) {
        // Update existing: stock & weighted average cost (only if price provided)
        const newStock = (existing.currentStock || 0) + qty;
        const newAvg = updateAverageCost(
          existing.purchasePrice || 0,
          existing.currentStock || 0,
          qty,
          movement.pricePerUnit
        );

        const updatedItem: InventoryItem = {
          ...existing,
          // name/unit might be updated by the incoming base item (keep newest names)
          name: item.name ?? existing.name,
          unit: item.unit ?? existing.unit,
          description: item.description ?? existing.description,
          reorderLevel:
            typeof item.reorderLevel === "number"
              ? item.reorderLevel
              : existing.reorderLevel,
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
        // Create new item
        const seedPrice =
          typeof movement.pricePerUnit === "number"
            ? movement.pricePerUnit
            : typeof item.purchasePrice === "number"
            ? item.purchasePrice
            : 0;

        const newItem: InventoryItem = {
          id: item.id,
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

    /** -------- NEW CASES -------- */

    case "UPDATE_ITEM": {
      const { id, patch } = action.payload;
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === id
            ? {
                ...it,
                // Only allow safe edits; leave stock & avg cost intact unless explicitly provided.
                name: patch.name ?? it.name,
                unit: patch.unit ?? it.unit,
                description: patch.description ?? it.description,
                reorderLevel:
                  typeof patch.reorderLevel === "number"
                    ? patch.reorderLevel
                    : it.reorderLevel,
                openingStockDate:
                  patch.openingStockDate ?? it.openingStockDate,
                // If someone *does* pass these we still honor them,
                // but your UI doesn't send them.
                currentStock:
                  typeof patch.currentStock === "number"
                    ? patch.currentStock
                    : it.currentStock,
                purchasePrice:
                  typeof patch.purchasePrice === "number"
                    ? patch.purchasePrice
                    : it.purchasePrice,
              }
            : it
        ),
        // Keep historical movements as-is; they snapshot itemName/unit at the time.
      };
    }

    case "DELETE_ITEM": {
      const { id } = action.payload;
      return {
        items: state.items.filter((it) => it.id !== id),
        movements: state.movements.filter((m) => m.itemId !== id),
      };
    }

    default:
      return state;
  }
}

/** ---------- Context ---------- */

type Ctx = {
  state: State;
  dispatch: React.Dispatch<Action>;
};

const InventoryContext = createContext<Ctx | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
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
  if (!ctx) {
    throw new Error("useInventory must be used within InventoryProvider");
  }
  return ctx;
}
