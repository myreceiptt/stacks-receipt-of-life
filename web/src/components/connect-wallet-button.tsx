"use client";

import { useWallet } from "@/hooks/use-wallet";

export function ConnectWalletButton() {
  const { address, isConnecting, connect, disconnect } = useWallet();

  if (address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

    return (
      <button
        onClick={disconnect}
        className="rounded-full border border-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] hover:bg-black hover:text-white">
        {short}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="rounded-full border border-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-60">
      {isConnecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
