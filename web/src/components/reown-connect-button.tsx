"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

export function ReownConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount({ namespace: "bip122" });
  const label =
    isConnected && address
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : "Connect wallet";

  return (
    <button
      onClick={() => open()}
      className="rounded-full border border-black bg-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black"
    >
      {label}
    </button>
  );
}
