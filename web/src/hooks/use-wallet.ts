"use client";

import { useWalletContext } from "@/providers/wallet-provider";

export function useWallet() {
  return useWalletContext();
}
