"use client";

import { useState, useCallback } from "react";

type WalletState = {
  address: string | null;
  isConnecting: boolean;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
  });

  const connect = useCallback(async () => {
    // TODO: wire this to Stacks Connect
    setState((prev) => ({ ...prev, isConnecting: true }));

    // For now, just simulate a connection with a placeholder address.
    await new Promise((resolve) => setTimeout(resolve, 500));

    setState({
      address: "SP_PLACEHOLDER_ADDRESS",
      isConnecting: false,
    });
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
