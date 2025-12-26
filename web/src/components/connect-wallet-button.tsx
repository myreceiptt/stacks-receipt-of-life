"use client";

import { useWallet } from "@/hooks/use-wallet";
import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { useState } from "react";

export function ConnectWalletButton() {
  const { address, isConnecting, connect, disconnect } = useWallet();
  const { open } = useAppKit();
  const { address: wcAddress, isConnected: wcConnected } = useAppKitAccount({
    namespace: "stacks",
  });
  const { disconnect: disconnectWc } = useDisconnect();
  const [isModalOpen, setModalOpen] = useState(false);
  const activeAddress = address ?? wcAddress ?? null;
  const short = activeAddress
    ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`
    : "Connect wallet";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="rounded-full border border-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-60"
      >
        {isConnecting ? "Connecting…" : short}
      </button>
      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-black bg-white p-5 shadow-[6px_6px_0_0_#000]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                Connect wallet
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <button
                onClick={() => {
                  connect();
                  setModalOpen(false);
                }}
                disabled={isConnecting}
                className="w-full rounded-xl border border-black px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-60"
              >
                {isConnecting
                  ? "Connecting…"
                  : "Connect Stacks wallet"}
              </button>
              <button
                onClick={() => {
                  setModalOpen(false);
                  void open();
                }}
                className="w-full rounded-xl border border-black bg-black px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black"
              >
                WalletConnect QR Code
              </button>
            </div>

            {address ? (
              <div className="mt-4 rounded-xl border border-black/20 bg-white px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.18em]">
                    Installed wallet
                  </span>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
                <div className="mt-2 font-medium">{short}</div>
              </div>
            ) : null}

            {wcConnected && wcAddress ? (
              <div className="mt-3 rounded-xl border border-black/20 bg-white px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.18em]">
                    WalletConnect
                  </span>
                  <button
                    onClick={() => disconnectWc({ namespace: "stacks" })}
                    className="text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
                <div className="mt-2 font-medium">
                  {`${wcAddress.slice(0, 6)}…${wcAddress.slice(-4)}`}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
