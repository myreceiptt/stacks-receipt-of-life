"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useCooldown } from "@/hooks/use-cooldown";
import { useAppKitAccount } from "@reown/appkit/react";
import { ReceiptModal } from "@/components/receipt-modal";
import {
  getLastId,
  getOwnedReceiptsPaged,
  getCreatedReceiptsPaged,
  getRoyaltyReceiptsPaged,
  type Receipt,
} from "@/lib/receipt-contract";

export default function MePage() {
  const { address } = useWallet();
  const { address: wcAddress } = useAppKitAccount({ namespace: "stacks" });
  const activeAddress = address ?? wcAddress ?? null;
  const { isCooling, remainingMs, markSuccess, startCooldownIfNeeded } =
    useCooldown();
  const pendingActionRef = useRef<null | (() => Promise<void>)>(null);
  const [ownedReceipts, setOwnedReceipts] = useState<Receipt[]>([]);
  const [ownedWindowStart, setOwnedWindowStart] = useState<number | null>(null);
  const [ownedHasMore, setOwnedHasMore] = useState(false);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedLoadingMore, setOwnedLoadingMore] = useState(false);

  const [createdReceipts, setCreatedReceipts] = useState<Receipt[]>([]);
  const [createdLoading, setCreatedLoading] = useState(false);

  const [royaltyReceipts, setRoyaltyReceipts] = useState<Receipt[]>([]);
  const [royaltyLoading, setRoyaltyLoading] = useState(false);

  const [totalOnChain, setTotalOnChain] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"owned" | "created" | "royalty">(
    "owned"
  );
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const hasOwned = ownedReceipts.length > 0;
  const hasTotal = typeof totalOnChain === "number" && totalOnChain > 0;
  const isLoading = ownedLoading || createdLoading || royaltyLoading;
  const activeLoading =
    activeTab === "owned"
      ? ownedLoading
      : activeTab === "created"
      ? createdLoading
      : royaltyLoading;
  const activeRefreshing = activeTab === "owned" ? ownedLoadingMore : false;
  const ownedPageSize = 10;

  useEffect(() => {
    if (!isCooling && pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action();
    }
  }, [isCooling]);

  const runWithCooldown = useCallback(
    (action: () => Promise<void>) => {
      if (startCooldownIfNeeded()) {
        pendingActionRef.current = action;
        return;
      }
      action();
    },
    [startCooldownIfNeeded]
  );

  const fetchOwnedWindow = useCallback(
    async (start: number) => {
      if (!activeAddress) {
        return { items: [] as Receipt[], startUsed: 1 };
      }
      let currentStart = start;
      while (true) {
        const { items } = await getOwnedReceiptsPaged(
          activeAddress,
          BigInt(currentStart),
          ownedPageSize
        );
        if (items.length > 0 || currentStart === 1) {
          const ordered = [...items].sort((a, b) => b.id - a.id);
          return { items: ordered, startUsed: currentStart };
        }
        const nextStart = Math.max(1, currentStart - ownedPageSize);
        if (nextStart === currentStart) {
          return { items: [] as Receipt[], startUsed: currentStart };
        }
        currentStart = nextStart;
      }
    },
    [activeAddress, ownedPageSize]
  );

  const loadOwnedInitial = useCallback(async () => {
    if (!activeAddress) return false;
    setOwnedLoading(true);
    setError(null);
    let ok = false;
    try {
      const total = await getLastId();
      if (total === 0) {
        setTotalOnChain(0);
        setOwnedReceipts([]);
        setOwnedWindowStart(null);
        setOwnedHasMore(false);
        ok = true;
        return ok;
      }
      const initialStart = Math.max(1, total - (ownedPageSize - 1));
      const { items, startUsed } = await fetchOwnedWindow(initialStart);
      setTotalOnChain(total);
      setOwnedReceipts(items);
      setOwnedWindowStart(startUsed);
      setOwnedHasMore(startUsed > 1);
      ok = true;
    } catch (err) {
      console.error(err);
      setError("Failed to load receipts from Stacks mainnet.");
    } finally {
      setOwnedLoading(false);
    }
    return ok;
  }, [activeAddress, ownedPageSize, fetchOwnedWindow]);

  const loadCreatedInitial = useCallback(async () => {
    if (!activeAddress) return false;
    setCreatedLoading(true);
    let ok = false;
    try {
      const total = await getLastId();
      const { items } = await getCreatedReceiptsPaged(
        activeAddress,
        null,
        10
      );
      setTotalOnChain(total);
      setCreatedReceipts(items);
      ok = true;
    } catch (err) {
      console.error(err);
    } finally {
      setCreatedLoading(false);
    }
    return ok;
  }, [activeAddress]);

  const loadRoyaltyInitial = useCallback(async () => {
    if (!activeAddress) return false;
    setRoyaltyLoading(true);
    let ok = false;
    try {
      const { items } = await getRoyaltyReceiptsPaged(
        activeAddress,
        null,
        10
      );
      setRoyaltyReceipts(items);
      ok = true;
    } catch (err) {
      console.error(err);
    } finally {
      setRoyaltyLoading(false);
    }
    return ok;
  }, [activeAddress]);

  useEffect(() => {
    if (!activeAddress) return;
    runWithCooldown(async () => {
      const ok = await loadOwnedInitial();
      if (ok) markSuccess();
    });
  }, [activeAddress, loadOwnedInitial, markSuccess, runWithCooldown]);

  useEffect(() => {
    if (!activeAddress) return;
    if (
      activeTab === "created" &&
      createdReceipts.length === 0 &&
      !createdLoading
    ) {
      runWithCooldown(async () => {
        const ok = await loadCreatedInitial();
        if (ok) markSuccess();
      });
    }
    if (
      activeTab === "royalty" &&
      royaltyReceipts.length === 0 &&
      !royaltyLoading
    ) {
      runWithCooldown(async () => {
        const ok = await loadRoyaltyInitial();
        if (ok) markSuccess();
      });
    }
  }, [
    activeTab,
    activeAddress,
    createdReceipts.length,
    createdLoading,
    loadCreatedInitial,
    markSuccess,
    runWithCooldown,
    royaltyReceipts.length,
    royaltyLoading,
    loadRoyaltyInitial,
  ]);

  // Reset data when disconnecting
  useEffect(() => {
    if (!activeAddress) {
      setOwnedReceipts([]);
      setOwnedWindowStart(null);
      setOwnedHasMore(false);
      setOwnedLoading(false);
      setOwnedLoadingMore(false);
      setCreatedReceipts([]);
      setCreatedLoading(false);
      setRoyaltyReceipts([]);
      setRoyaltyLoading(false);
      setTotalOnChain(null);
      setError(null);
    }
  }, [activeAddress]);

  const handleRefresh = async () => {
    if (!activeAddress) return;
    if (activeTab === "owned") {
      runWithCooldown(async () => {
        setError(null);
        setOwnedLoading(true);
        const ok = await loadOwnedInitial();
        if (ok) markSuccess();
        setOwnedLoading(false);
      });
      return;
    }
    if (activeTab === "created") {
      runWithCooldown(async () => {
        setCreatedLoading(true);
        const ok = await loadCreatedInitial();
        if (ok) markSuccess();
        setCreatedLoading(false);
      });
      return;
    }
    runWithCooldown(async () => {
      setRoyaltyLoading(true);
      const ok = await loadRoyaltyInitial();
      if (ok) markSuccess();
      setRoyaltyLoading(false);
    });
  };

  const handleLoadMoreOwned = async () => {
    if (!activeAddress || !ownedWindowStart || !ownedHasMore) return;
    runWithCooldown(async () => {
      setOwnedLoadingMore(true);
      try {
        const nextStart = Math.max(1, ownedWindowStart - ownedPageSize);
        const { items, startUsed } = await fetchOwnedWindow(nextStart);
        setOwnedReceipts((prev) => [...prev, ...items]);
        setOwnedWindowStart(startUsed);
        setOwnedHasMore(startUsed > 1);
        markSuccess();
      } catch (err) {
        console.error(err);
        setError("Failed to load more owned receipts.");
      } finally {
        setOwnedLoadingMore(false);
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
              My Receipts · on-chain
            </p>
            {!activeAddress && (
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Connect to View Your Receipts.
              </h1>
            )}
            {activeAddress && (
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Your Receipts on Stacks.
              </h1>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {activeAddress && (
              <span className="rounded-full border border-black bg-white px-3 py-1 font-mono">
                {activeAddress.slice(0, 8)}…{activeAddress.slice(-4)}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={!activeAddress || activeLoading || isCooling}
              className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-40">
              {activeRefreshing || activeLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          This page displays your{" "}
          <span className="font-bold">Receipts of Life</span>, stamped with the{" "}
          <span className="font-bold">$MyReceipt</span> contract secured by{" "}
          <span className="font-bold">Bitcoin</span> via{" "}
          <span className="font-bold">Stacks mainnet</span>.
        </p>
      </header>

      {!activeAddress && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar to see your receipts.
        </div>
      )}

      {activeAddress && (
        <div className="space-y-4">
          <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
            You can view the receipts you own, the ones you created, and those
            that bring royalty for you. Each receipt is a small proof that you
            were paying attention to your own life and the lives of others.
          </p>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("owned")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "owned"
                  ? "border-black bg-black text-white hover:bg-white hover:text-black"
                  : "border-black bg-white hover:bg-black hover:text-white"
              }`}>
              Owned
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("created")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "created"
                  ? "border-black bg-black text-white hover:bg-white hover:text-black"
                  : "border-black bg-white hover:bg-black hover:text-white"
              }`}>
              Created
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("royalty")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "royalty"
                  ? "border-black bg-black text-white hover:bg-white hover:text-black"
                  : "border-black bg-white hover:bg-black hover:text-white"
              }`}>
              Royalty
            </button>
          </div>

          {isCooling ? (
            <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                {activeTab === "owned"
                  ? "Your Owned Receipts"
                  : activeTab === "created"
                  ? "Your Created Receipts"
                  : "Royalty Receipts"}
              </p>
              <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                Cooling down for {Math.max(0, Math.ceil(remainingMs))}{" "}
                milliseconds and then loading on-chain data...
              </div>
            </div>
          ) : (
            activeTab === "owned" && (
              <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                  Your Owned Receipts
                </p>

                {activeLoading && (
                  <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Loading on-chain receipts...
                  </div>
                )}

                {error && (
                  <div className="rounded-md border border-dashed border-red-400 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {!isLoading && !error && !hasOwned && hasTotal && (
                  <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                    There are{" "}
                    <span className="font-mono">
                      {totalOnChain} receipt{totalOnChain === 1 ? "" : "s"}
                    </span>{" "}
                    , but none are owned by you.
                  </div>
                )}

                {!isLoading && !error && hasOwned && (
                  <ul className="space-y-3">
                    {ownedReceipts.map((r) => {
                      const date = new Date(r.createdAt * 1000);
                      return (
                        <li
                          key={r.id}
                          className="rounded-xl border border-black bg-white p-4 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(r)}
                              className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white">
                              Receipt #{r.id}
                            </button>
                            <span className="text-[11px] text-neutral-500">
                              {date.toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                            <span className="font-mono wrap-break-word">
                              Creator: {r.creator.slice(0, 8)}…
                              {r.creator.slice(-4)}
                            </span>
                            <a
                              href={`https://explorer.stacks.co/address/${r.creator}?chain=mainnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline">
                              View creator
                            </a>
                            <span className="font-mono wrap-break-word">
                              Owner: {r.owner.slice(0, 8)}…{r.owner.slice(-4)}
                            </span>
                            <a
                              href={`https://explorer.stacks.co/address/${r.owner}?chain=mainnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline">
                              View owner
                            </a>
                            <span className="font-mono wrap-break-word">
                              Royalty to: {r.royaltyRecipient.slice(0, 8)}…
                              {r.royaltyRecipient.slice(-4)}
                            </span>
                            <a
                              href={`https://explorer.stacks.co/address/${r.royaltyRecipient}?chain=mainnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline">
                              View royalty
                            </a>
                            {activeAddress &&
                              (r.creator === activeAddress ||
                                r.owner === activeAddress ||
                                r.royaltyRecipient === activeAddress) && (
                                <span className="rounded-full border border-black px-2 py-1">
                                  You are involved
                                </span>
                              )}
                          </div>
                        </li>
                      );
                    })}
                    {ownedHasMore ? (
                      <li>
                        <button
                          type="button"
                          onClick={handleLoadMoreOwned}
                          disabled={ownedLoadingMore}
                          className="rounded-full border border-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                          {ownedLoadingMore ? "Loading…" : "Load more"}
                        </button>
                      </li>
                    ) : (
                      <li className="text-[11px]">
                        <span className="rounded-full border border-black bg-neutral-50 px-2 py-1">
                          Owned · {ownedReceipts.length} receipt
                          {ownedReceipts.length > 1 ? "s" : ""}
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )
          )}
          <ReceiptModal
            isOpen={!!selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
            receipt={selectedReceipt}
          />
        </div>
      )}
    </section>
  );
}
