import { create } from "zustand";
import type { Transaction } from "@/types";

interface WalletState {
  balance: number;
  transactions: Transaction[];
  setWallet: (balance: number, transactions: Transaction[]) => void;
  setBalance: (balance: number) => void;
  setTransactions: (transactions: Transaction[]) => void;
  prependTransaction: (transaction: Transaction) => void;
  clear: () => void;
}

export const useWallet = create<WalletState>((set) => ({
  balance: 0,
  transactions: [],
  setWallet: (balance, transactions) => set({ balance, transactions }),
  setBalance: (balance) => set({ balance }),
  setTransactions: (transactions) => set({ transactions }),
  prependTransaction: (transaction) => set((state) => ({
    transactions: state.transactions.some((item) => item.id === transaction.id)
      ? state.transactions
      : [transaction, ...state.transactions],
  })),
  clear: () => set({ balance: 0, transactions: [] }),
}));
