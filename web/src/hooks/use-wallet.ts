"use client";

import { useState, useCallback } from "react";
import { request as stacksRequest } from "@stacks/connect";

type WalletState = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
};

type AddressShape = {
  address?:
    | string
    | {
        testnet?: string;
        mainnet?: string;
      };
  stxAddress?: string;
  addresses?: {
    stx?: Array<{
      address?: string;
    }>;
  };
};

function extractFromAddressShape(obj: AddressShape): string | null {
  // direct string address
  if (typeof obj.address === "string") {
    return obj.address;
  }

  // stxAddress field
  if (typeof obj.stxAddress === "string") {
    return obj.stxAddress;
  }

  // object address { testnet/mainnet }
  if (obj.address && typeof obj.address === "object") {
    const addrObj = obj.address;
    if (typeof addrObj.testnet === "string") return addrObj.testnet;
    if (typeof addrObj.mainnet === "string") return addrObj.mainnet;
  }

  // addresses.stx[0].address
  const firstStx = obj.addresses?.stx?.[0];
  if (firstStx && typeof firstStx.address === "string") {
    return firstStx.address;
  }

  return null;
}

function extractStxAddress(result: unknown): string | null {
  // Array response
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];

    if (typeof first === "string") {
      return first;
    }

    if (typeof first === "object" && first !== null) {
      return extractFromAddressShape(first as AddressShape);
    }
  }

  // Single object response
  if (typeof result === "object" && result !== null) {
    return extractFromAddressShape(result as AddressShape);
  }

  return null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (state.isConnecting) return;

    try {
      setState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      const result = await stacksRequest(
        { forceWalletSelect: false },
        "stx_getAccounts"
      );

      const stxAddress = extractStxAddress(result);

      if (!stxAddress) {
        throw new Error("Could not determine Stacks address from wallet.");
      }

      setState({
        address: stxAddress,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to connect wallet", error);
      setState({
        address: null,
        isConnected: false,
        isConnecting: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while connecting",
      });
    }
  }, [state.isConnecting]);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  return {
    address: state.address,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    connect,
    disconnect,
  };
}
