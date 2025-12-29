"use client";

import { useWallet } from "@/hooks/use-wallet";
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
} from "@reown/appkit/react";
import { useEffect, useState } from "react";

export function ConnectWalletButton() {
  const { address, isConnecting, connect, disconnect } = useWallet();
  const { open } = useAppKit();
  const { address: wcAddress, isConnected: wcConnected } = useAppKitAccount({
    namespace: "stacks",
  });
  const { disconnect: disconnectWc } = useDisconnect();
  const [isModalOpen, setModalOpen] = useState(false);
  const activeAddress = address ?? wcAddress ?? null;
  const hasConnection = !!activeAddress;
  const short = activeAddress
    ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`
    : "Connect wallet";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const styleId = "stacks-connect-backdrop";
    const applyBackdrop = (modal: Element) => {
      const shadow = (modal as HTMLElement).shadowRoot;
      if (!shadow || shadow.getElementById(styleId)) return;
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .modal-container {
          background: rgba(0, 0, 0, 0.50) !important;
          backdrop-filter: blur(8px) !important;
        }
      `;
      shadow.appendChild(style);
    };

    document.querySelectorAll("connect-modal").forEach(applyBackdrop);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.tagName.toLowerCase() === "connect-modal") {
            applyBackdrop(node);
            continue;
          }
          node.querySelectorAll?.("connect-modal").forEach(applyBackdrop);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="rounded-full border border-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-60">
        {isConnecting ? "Connect Wallet" : short}
      </button>
      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.50)] backdrop-blur-sm px-4"
          onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-black bg-white p-5 shadow-[6px_6px_0_0_#000]"
            onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                Connect wallet
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-black px-3 py-1 text-xs uppercase tracking-[0.18em] hover:bg-black hover:text-white">
                Close
              </button>
            </div>

            {!hasConnection ? (
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => {
                    connect();
                    setModalOpen(false);
                  }}
                  disabled={isConnecting}
                  className="w-full rounded-xl border border-black bg-black px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black disabled:opacity-60">
                  {isConnecting ? "Connecting…" : "Connect Stacks wallet"}
                </button>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    void open();
                  }}
                  className="w-full rounded-xl border border-black bg-black px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black">
                  WalletConnect QR Code
                </button>
              </div>
            ) : null}

            {address ? (
              <div className="mt-4 rounded-xl border border-black/20 bg-white px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.18em]">
                    Connected Wallet
                  </span>
                  <button
                    onClick={() => disconnect()}
                    className="rounded-full border border-black bg-black px-3 py-1 text-xs uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black">
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
                    Connected Wallet
                  </span>
                  <button
                    onClick={() => disconnectWc({ namespace: "stacks" })}
                    className="rounded-full border border-black px-3 py-1 text-xs uppercase tracking-[0.18em] hover:bg-black hover:text-white">
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
