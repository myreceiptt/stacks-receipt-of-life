"use client";

import { useState, useCallback } from "react";

type WalletState = {
  address: string | null;
  isConnecting: boolean;
};

function extractFirstAddress(result: unknown): string | null {
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];
    if (typeof first === "string") return first;
    if (typeof first === "object" && first !== null) {
      const obj = first as Record<string, unknown>;
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
    }
  }
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
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

      let result: unknown;

      try {
        result = await stacksRequest(
          { forceWalletSelect: true },
          "stx_getAccounts"
        );
      } catch {
        try {
          result = await stacksRequest(
            { forceWalletSelect: true },
            "stx_getAddresses"
          );
        } catch {
          result = await stacksRequest(
            { forceWalletSelect: true },
            "getAddresses"
          );
        }
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
