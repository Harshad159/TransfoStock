import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import type { InventoryItem, StockMovement, InwardDetails, OutwardDetails } from '../types';
import { initialInventoryData } from '../constants';

type Action =
  | { type: 'ADD_INWARD_ENTRY'; payload: { item: InventoryItem, movement: StockMovement } }
  | { type: 'ADD_OUTWARD_ENTRY'; payload: { itemId: string, movement: StockMovement } };

interface InventoryState {
  items: InventoryItem[];
}

interface InventoryContextType {
  state: InventoryState;
  dispatch: React.Dispatch<Action>;
  getItemById: (id: string) => InventoryItem | undefined;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'transfoStockInventory';

const inventoryReducer = (state: InventoryState, action: Action): InventoryState => {
  switch (action.type) {
    case 'ADD_INWARD_ENTRY': {
      const existingItemIndex = state.items.findIndex(i => i.name.toLowerCase() === action.payload.item.name.toLowerCase());
      if (existingItemIndex !== -1) {
        // Update existing item
        const updatedItems = [...state.items];
        const existingItem = { ...updatedItems[existingItemIndex] }; // Create a shallow copy to avoid direct mutation
        
        existingItem.currentStock += action.payload.movement.quantity;
        
        // Add the new transaction to the beginning of the history array
        existingItem.history = [action.payload.movement, ...existingItem.history];

        updatedItems[existingItemIndex] = existingItem;
        
        return { ...state, items: updatedItems };
      } else {
        // Add new item
        const newItem = {
            ...action.payload.item,
            currentStock: action.payload.movement.quantity,
            history: [action.payload.movement]
        };
        return { ...state, items: [...state.items, newItem] };
      }
    }
    case 'ADD_OUTWARD_ENTRY': {
       const updatedItems = state.items.map(item => {
        if (item.id === action.payload.itemId) {
          return {
            ...item,
            currentStock: item.currentStock - action.payload.movement.quantity,
            history: [action.payload.movement, ...item.history]
          };
        }
        return item;
      });
      return { ...state, items: updatedItems };
    }
    default:
      return state;
  }
};


export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(inventoryReducer, { items: [] }, (initial) => {
      try {
        const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedState) {
            return JSON.parse(storedState);
        }
      } catch (error) {
          console.error("Failed to parse inventory from localStorage", error);
      }
      return { items: initialInventoryData };
  });

  useEffect(() => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch(error) {
        console.error("Failed to save inventory to localStorage", error);
    }
  }, [state]);

  const getItemById = (id: string) => state.items.find(item => item.id === id);

  return (
    <InventoryContext.Provider value={{ state, dispatch, getItemById }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};