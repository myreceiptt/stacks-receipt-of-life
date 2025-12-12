"use client";

import { useState, useCallback } from "react";
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
  const [state, setState] = useState<WalletState>(() => {
    try {
      if (isConnected()) {
        const data = getLocalStorage();
        const stxAddress = data?.addresses?.stx?.[0]?.address ?? null;
        if (stxAddress) {
          return {
            address: stxAddress,
            isConnecting: false,
          };
        }
      }
    } catch (error) {
      console.error("Failed to hydrate wallet state", error);
    }

    return {
      address: null,
      isConnecting: false,
    };
  });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      if (!isConnected()) {
        await stacksConnect({
          forceWalletSelect: true,
        });
      }

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
