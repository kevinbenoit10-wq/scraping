export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ticketIndex: number;
}

export interface Receipt {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  currency: string;
}

export interface ItemClaim {
  itemId: string;
  personName: string;
  portionCount: number;
}

export interface PersonSummary {
  name: string;
  items: {
    item: ReceiptItem;
    portionCount: number;
    portionCost: number;
  }[];
  subtotal: number;
  taxShare: number;
  deliveryFeeShare: number;
  total: number;
}

export interface PaymentRecord {
  personName: string;
  amount: number;
  paid: boolean;
}

export interface HistoryEntry {
  id: string;
  date: string;
  mode: 'scan-split' | 'table-mode';
  currency: string;
  total: number;
  payments: PaymentRecord[];
}

export type RootStackParamList = {
  Home: undefined;
  Scan: { tableMode?: boolean } | undefined;
  Claim: { receipts: Receipt[] };
  Summary: { receipts: Receipt[]; claims: ItemClaim[]; mode?: 'scan-split' | 'table-mode' };
  TableModeHost: { receipts: Receipt[] };
  History: undefined;
};
