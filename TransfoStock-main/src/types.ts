export type Unit = "Nos" | "Kg" | "Ltr" | "Meter" | "Set" | "Box";

export interface StockMovement {
  id: string;
  type: "INWARD" | "OUTWARD" | "RETURN";
  date: string;
  quantity: number;
  note?: string;
  user?: string;
  billNo?: string;
  billDate?: string;
  purchaser?: string;
  givenTo?: string;
  labourName?: string;
  reason?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: Unit;
  purchasePrice: number;
  description?: string;
  openingStockDate?: string;
  reorderLevel: number;
  currentStock: number;
  history: StockMovement[];
  deleteRequested?: boolean;
}
