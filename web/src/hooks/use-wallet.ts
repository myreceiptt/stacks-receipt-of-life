"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  getLocalStorage,
  isConnected,
} from "@stacks/connect";

type WalletState = {
  address: string | null;
  isConnecting: boolean;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
  });

  // Hydrate from local storage if the wallet is already connected
  useEffect(() => {
    try {
      if (isConnected()) {
        const data = getLocalStorage();
        const stxAddress = data?.addresses?.stx?.[0]?.address ?? null;
        if (stxAddress) {
          setState((prev) => ({
            ...prev,
            address: stxAddress,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to hydrate wallet state", error);
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      // If not yet connected, open the wallet selection modal
      if (!isConnected()) {
        await stacksConnect({
          forceWalletSelect: true,
        });
      }

      // Read addresses from local storage
      const data = getLocalStorage();
      const stxAddress = data?.addresses?.stx?.[0]?.address ?? null;

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
    try {
      stacksDisconnect();
    } catch (error) {
      console.error("Wallet disconnect failed", error);
    }

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
