"use client";

import { useState, useCallback } from "react";

type WalletState = {
  address: string | null;
  isConnecting: boolean;
};

function extractFirstAddress(result: unknown): string | null {
  // Unwrap { result: ... } if present
  const payload =
    result &&
    typeof result === "object" &&
    "result" in (result as Record<string, unknown>)
      ? (result as Record<string, unknown>).result
      : result;

  const pick = (obj: Record<string, unknown> | null): string | null => {
    if (!obj) return null;
    return (
      (obj as { address?: string })?.address ??
      (obj as { stxAddress?: string })?.stxAddress ??
      (obj as { addresses?: { stx?: Array<{ address?: string }> } })?.addresses
        ?.stx?.[0]?.address ??
      (obj as { address?: { testnet?: string; mainnet?: string } })?.address
        ?.testnet ??
      (obj as { address?: { testnet?: string; mainnet?: string } })?.address
        ?.mainnet ??
      null
    );
  };

  // If payload has top-level addresses array (e.g., [{ address, symbol: "STX" }])
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { addresses?: unknown }).addresses)
  ) {
    const addrArray = (payload as { addresses?: Array<Record<string, unknown>> })
      .addresses;
    const stxEntry =
      addrArray?.find((item) => item?.symbol === "STX" && item.address) ??
      addrArray?.[0];
    if (stxEntry && typeof stxEntry === "object") {
      const addr = pick(stxEntry as Record<string, unknown>);
      if (addr) return addr;
      if ("address" in stxEntry && typeof stxEntry.address === "string") {
        return stxEntry.address;
      }
    }
  }

  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0];
    if (typeof first === "string") return first;
    if (typeof first === "object" && first !== null) {
      return pick(first as Record<string, unknown>);
    }
  }
  if (typeof payload === "object" && payload !== null) {
    return pick(payload as Record<string, unknown>);
  }
  return null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
  });

  const connect = useCallback(async () => {
    // Client-only: do nothing on server render
    if (typeof window === "undefined") return;

    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      // Always load real client module on demand
      const { request: stacksRequest } = await import("@stacks/connect");

      const preferred = ["getAddresses", "stx_getAddresses", "stx_getAccounts"];
      let lastError: unknown = null;
      let result: unknown = null;

      for (let i = 0; i < preferred.length; i++) {
        const method = preferred[i];
        try {
          result = await stacksRequest(
            { forceWalletSelect: i === 0 }, // only prompt once
            method as "getAddresses"
          );
          break;
        } catch (err) {
          lastError = err;
          // try next method
        }
      }

      if (result === null) {
        throw lastError ?? new Error("Wallet did not return any addresses.");
      }

      const stxAddress = extractFirstAddress(result);
      if (!stxAddress) {
        throw new Error("Could not determine Stacks address from wallet.");
      }

      setState({
        address: stxAddress,
        isConnecting: false,
      });
    } catch (error) {
      console.error("Wallet connection failed", error);
      setState({
        address: null,
        isConnecting: false,
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnecting: false,
    });
  }, []);

  return {
    address: state.address,
    isConnecting: state.isConnecting,
    connect,
    disconnect,
  };
}
