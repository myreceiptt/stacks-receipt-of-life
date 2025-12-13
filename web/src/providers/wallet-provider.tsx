"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

type WalletState = {
  address: string | null;
  isConnecting: boolean;
};

type WalletContextValue = {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const STORAGE_KEY = "stacks.wallet.address";

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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
  });

  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;

    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      const { request: stacksRequest } = await import("@stacks/connect");

      const preferred = ["getAddresses", "stx_getAddresses", "stx_getAccounts"];
      let lastError: unknown = null;
      let result: unknown = null;

      for (let i = 0; i < preferred.length; i++) {
        const method = preferred[i];
        try {
          result = await stacksRequest(
            { forceWalletSelect: i === 0 }, // prompt only once
            method as "getAddresses"
          );
          break;
        } catch (err) {
          lastError = err;
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
      try {
        window.localStorage.setItem(STORAGE_KEY, stxAddress);
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      console.error("Wallet connection failed", error);
      setState({
        address: null,
        isConnecting: false,
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState({
      address: null,
      isConnecting: false,
    });
  }, []);

  // Hydrate from cached address only (no wallet prompt)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setState({ address: cached, isConnecting: false });
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address: state.address,
        isConnecting: state.isConnecting,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWalletContext must be used within WalletProvider");
  }
  return ctx;
}
