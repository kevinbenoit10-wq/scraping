export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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

export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  Claim: { receipt: Receipt };
  Summary: { receipt: Receipt; claims: ItemClaim[] };
};
