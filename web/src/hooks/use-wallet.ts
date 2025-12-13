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

function pickSupportedMethod(
  supported: unknown,
  preferred: string[]
): string | null {
  if (!Array.isArray(supported)) return null;
  for (const method of preferred) {
    if (supported.includes(method)) return method;
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

      // Discover supported methods if wallet exposes them
      let supported: unknown = null;
      try {
        supported = await stacksRequest(
          { forceWalletSelect: false },
          "getAddresses"
        );
      } catch {
        // ignore; we'll fall back to method list
      }

      const preferred = ["getAddresses", "stx_getAddresses", "stx_getAccounts"];
      // If supported was a method list, use it; if it's an address payload, leave method as default
      const method =
        (Array.isArray(supported) &&
          pickSupportedMethod(supported, preferred)) ||
        preferred[0];

      const result = await stacksRequest(
        { forceWalletSelect: true },
        method as "getAddresses"
      );

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
