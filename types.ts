export interface StockMovement {
  id: string;
  type: 'inward' | 'outward' | 'return';
  date: string;
  quantity: number;
  details: InwardDetails | OutwardDetails | ReturnDetails;
}

export interface InwardDetails {
  purchaserName: string;
  billNo: string;
  billDate: string;
  purchasePrice: number;
}

export interface OutwardDetails {
  givenTo: string;
  siteName: string;
  tenderNo?: string;
}

export interface ReturnDetails {
  returnedBy: string;
  reason: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  purchasePrice: number;
  description: string;
  openingStockDate: string;
  reorderLevel: number;
  currentStock: number;
  history: StockMovement[];
}