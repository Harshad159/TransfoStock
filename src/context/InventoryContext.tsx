import React, { createContext, useContext, useEffect, useReducer } from "react";
import type { InventoryItem, StockMovement } from "../types";

/** ---------- Types ---------- */

export type InventoryState = {
  items: InventoryItem[];
  movements: StockMovement[]; // global chronological log (all items)
  lastUpdated?: string;
};

type InOutPayload = {
  item: Omit<InventoryItem, "currentStock" | "history" | "deleteRequested">;
  movement: StockMovement; // type: "INWARD" | "OUTWARD" | "RETURN"
};

type Actions =
  | { type: "INIT"; payload: InventoryState }
  | { type: "INWARD"; payload: InOutPayload }
  | { type: "OUTWARD"; payload: InOutPayload }
  | { type: "RESET_ALL" };

const DEFAULT_STATE: InventoryState = {
  items: [],
  movements: [],
  lastUpdated: undefined,
};

/** ---------- Storage helpers ---------- */

const LS_KEY = "transfostock_state_v1";

function loadFromLS(): InventoryState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic sanity
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.movements)) {
      return null;
    }
    return parsed as InventoryState;
  } catch {
    return null;
  }
}

function saveToLS(state: InventoryState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

/** ---------- Reducer ---------- */

function upsertItem(items: InventoryItem[], base: Omit<InventoryItem, "currentStock" | "history" | "deleteRequested">) {
  const idx = items.findIndex((x) => x.id === base.id);
  if (idx >= 0) {
    // Update mutable fields but keep currentStock/history
    const old = items[idx];
    const updated: InventoryItem = {
      ...old,
      name: base.name,
      unit: base.unit,
      purchasePrice: base.purchasePrice,
      description: base.description,
      openingStockDate: base.openingStockDate,
      reorderLevel: base.reorderLevel,
    };
    items[idx] = updated;
    return { items, index: idx, wasNew: false };
  } else {
    const created: InventoryItem = {
      ...base,
      currentStock: 0,
      history: [],
    };
    items.push(created);
    return { items, index: items.length - 1, wasNew: true };
  }
}

function insertMovementGlobally(movements: StockMovement[], mv: StockMovement, itemId: string, itemName: string) {
  const enriched: StockMovement = {
    ...mv,
    itemId,
    itemName, // not in the base type? keep it, harmless to have extra field
  } as StockMovement & { itemId: string; itemName: string };

  // keep newest first
  const copy = [enriched, ...movements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  // (optional) cap size to avoid unbounded growth
  if (copy.length > 2000) copy.length = 2000;
  return copy;
}

function reducer(state: InventoryState, action: Actions): InventoryState {
  switch (action.type) {
    case "INIT":
      return { ...state, ...action.payload };

    case "INWARD": {
      const itemsCopy = state.items.map((x) => ({ ...x, history: [...x.history] }));
      const { item: base, movement } = action.payload;

      const { index } = upsertItem(itemsCopy, base);
      const it = itemsCopy[index];

      // RETURN is logically an inward (adds back stock), but we keep movement.type as given
      const delta = Math.abs(movement.quantity || 0);
      it.currentStock = (it.currentStock || 0) + delta;

      // per-item history newest first
      it.history = [
        { ...movement },
        ...it.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      ];

      const global = insertMovementGlobally(state.movements, movement, it.id, it.name);

      const next: InventoryState = {
        ...state,
        items: itemsCopy,
        movements: global,
        lastUpdated: new Date().toISOString(),
      };
      saveToLS(next);
      return next;
    }

    case "OUTWARD": {
      const itemsCopy = state.items.map((x) => ({ ...x, history: [...x.history] }));
      const { item: base, movement } = action.payload;

      const { index } = upsertItem(itemsCopy, base);
      const it = itemsCopy[index];

      const qty = Math.abs(movement.quantity || 0);
      const before = it.currentStock || 0;
      const after = Math.max(0, before - qty); // prevent negative stock
      it.currentStock = after;

      it.history = [
        { ...movement },
        ...it.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      ];

      const global = insertMovementGlobally(state.movements, movement, it.id, it.name);

      const next: InventoryState = {
        ...state,
        items: itemsCopy,
        movements: global,
        lastUpdated: new Date().toISOString(),
      };
      saveToLS(next);
      return next;
    }

    case "RESET_ALL": {
      saveToLS(DEFAULT_STATE);
      return DEFAULT_STATE;
    }

    default:
      return state;
  }
}

/** ---------- Context ---------- */

const Ctx = createContext<{
  state: InventoryState;
  dispatch: React.Dispatch<Actions>;
}>({ state: DEFAULT_STATE, dispatch: () => {} });

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  // init from localStorage
  useEffect(() => {
    const loaded = loadFromLS();
    if (loaded) dispatch({ type: "INIT", payload: loaded });
  }, []);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
};

export const useInventory = () => useContext(Ctx);
