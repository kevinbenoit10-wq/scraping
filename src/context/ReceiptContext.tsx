import React, { createContext, useContext, useState } from 'react';
import { Receipt, ItemClaim } from '../types';

interface ReceiptContextValue {
  receipt: Receipt | null;
  claims: ItemClaim[];
  setReceipt: (r: Receipt) => void;
  setClaims: (c: ItemClaim[]) => void;
  reset: () => void;
}

const ReceiptContext = createContext<ReceiptContextValue | null>(null);

export function ReceiptProvider({ children }: { children: React.ReactNode }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [claims, setClaims] = useState<ItemClaim[]>([]);

  return (
    <ReceiptContext.Provider
      value={{
        receipt,
        claims,
        setReceipt,
        setClaims,
        reset: () => {
          setReceipt(null);
          setClaims([]);
        },
      }}
    >
      {children}
    </ReceiptContext.Provider>
  );
}

export function useReceipt() {
  const ctx = useContext(ReceiptContext);
  if (!ctx) throw new Error('useReceipt must be used within ReceiptProvider');
  return ctx;
}
