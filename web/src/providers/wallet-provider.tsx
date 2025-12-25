"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import type { UniversalConnector } from "@reown/appkit-universal-connector";
import { getUniversalConnector } from "@/lib/reown";

type WalletState = {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected?: boolean;
};

const WalletContext = createContext<WalletState | undefined>(undefined);

const STORAGE_KEY = "wallet:stx-address";

type StacksSession = {
  namespaces?: {
    stacks?: {
      accounts?: string[];
    };
  };
};

function extractStacksAddress(session: unknown): string | null {
  const stacksAccounts: string[] | undefined =
    typeof session === "object" && session !== null
      ? (session as StacksSession).namespaces?.stacks?.accounts
      : undefined;

  if (!stacksAccounts || stacksAccounts.length === 0) {
    return null;
  }

  const first = stacksAccounts[0];
  const parts = first.split(":");
  return parts[2] ?? null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [universalConnector, setUniversalConnector] =
    useState<UniversalConnector | null>(null);
  const [session, setSession] = useState<StacksSession | null>(null);
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
    connect: async () => {},
    disconnect: async () => {},
  });

  useEffect(() => {
    let isMounted = true;

    getUniversalConnector()
      .then((connector) => {
        if (!isMounted) return;
        setUniversalConnector(connector);

        const existingSession = connector.provider.session;
        if (existingSession) {
          setSession(existingSession as StacksSession);
          const address = extractStacksAddress(existingSession);
          setState((prev) => ({
            ...prev,
            address,
            isConnecting: false,
            ...(typeof prev.isConnected === "boolean"
              ? { isConnected: !!address }
              : {}),
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to init universal connector", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const connect = useCallback(async () => {
    if (!universalConnector) return;
    if (session) {
      const address = extractStacksAddress(session);
      setState((prev) => ({
        ...prev,
        address,
        isConnecting: false,
        ...(typeof prev.isConnected === "boolean"
          ? { isConnected: !!address }
          : {}),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
    }));

    try {
      const { session: providerSession } =
        await universalConnector.connect();

      setSession(providerSession as StacksSession);

      const address = extractStacksAddress(providerSession);

      setState((prev) => ({
        ...prev,
        address,
        isConnecting: false,
        ...(typeof prev.isConnected === "boolean"
          ? { isConnected: !!address }
          : {}),
      }));

      try {
        if (address) {
          window.localStorage.setItem(STORAGE_KEY, address);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      console.error("Wallet connection failed", error);
      setState((prev) => ({
        ...prev,
        address: null,
        isConnecting: false,
        ...(typeof prev.isConnected === "boolean"
          ? { isConnected: false }
          : {}),
      }));
    }
  }, [session, universalConnector]);

  const disconnect = useCallback(async () => {
    try {
      if (universalConnector) {
        await universalConnector.disconnect();
      }
    } catch (err) {
      console.error("Error disconnecting universal connector", err);
    }

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    setSession(null);
    setState((prev) => ({
      ...prev,
      address: null,
      isConnecting: false,
      ...(typeof prev.isConnected === "boolean" ? { isConnected: false } : {}),
    }));
  }, [universalConnector]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
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
