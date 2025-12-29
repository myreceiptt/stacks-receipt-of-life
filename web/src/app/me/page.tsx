"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useCooldown } from "@/hooks/use-cooldown";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  getLastId,
  getOwnedReceiptsPaged,
  getCreatedReceiptsPaged,
  getRoyaltyReceiptsPaged,
  transferReceipt,
  setReceiptRoyaltyRecipient,
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
  const [createdNextStart, setCreatedNextStart] = useState<bigint | null>(null);
  const [createdLoading, setCreatedLoading] = useState(false);
  const [createdLoadingMore, setCreatedLoadingMore] = useState(false);
  const [createdError, setCreatedError] = useState<string | null>(null);

  const [royaltyReceipts, setRoyaltyReceipts] = useState<Receipt[]>([]);
  const [royaltyNextStart, setRoyaltyNextStart] = useState<bigint | null>(null);
  const [royaltyLoading, setRoyaltyLoading] = useState(false);
  const [royaltyLoadingMore, setRoyaltyLoadingMore] = useState(false);
  const [royaltyError, setRoyaltyError] = useState<string | null>(null);

  const [totalOnChain, setTotalOnChain] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"owned" | "created" | "royalty">(
    "owned"
  );
  const [transferInputs, setTransferInputs] = useState<Record<number, string>>(
    {}
  );
  const [transferErrors, setTransferErrors] = useState<Record<number, string>>(
    {}
  );
  const [transferSuccess, setTransferSuccess] = useState<
    Record<number, string>
  >({});
  const [transferring, setTransferring] = useState<Record<number, boolean>>({});

  const [royaltyInputs, setRoyaltyInputs] = useState<Record<number, string>>(
    {}
  );
  const [royaltyErrors, setRoyaltyErrors] = useState<Record<number, string>>(
    {}
  );
  const [royaltySuccess, setRoyaltySuccess] = useState<Record<number, string>>(
    {}
  );
  const [royaltyUpdating, setRoyaltyUpdating] = useState<
    Record<number, boolean>
  >({});

  const hasOwned = ownedReceipts.length > 0;
  const hasCreated = createdReceipts.length > 0;
  const hasTotal = typeof totalOnChain === "number" && totalOnChain > 0;
  const hasRoyalty = royaltyReceipts.length > 0;
  const isLoading = ownedLoading || createdLoading || royaltyLoading;
  const activeLoading =
    activeTab === "owned"
      ? ownedLoading
      : activeTab === "created"
      ? createdLoading
      : royaltyLoading;
  const activeRefreshing =
    activeTab === "owned"
      ? ownedLoadingMore
      : activeTab === "created"
      ? createdLoadingMore
      : royaltyLoadingMore;
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
    setCreatedError(null);
    let ok = false;
    try {
      const total = await getLastId();
      const { items, nextStartId } = await getCreatedReceiptsPaged(
        activeAddress,
        null,
        10
      );
      setTotalOnChain(total);
      setCreatedReceipts(items);
      setCreatedNextStart(nextStartId);
      ok = true;
    } catch (err) {
      console.error(err);
      setCreatedError("Failed to load created receipts from Stacks mainnet.");
    } finally {
      setCreatedLoading(false);
    }
    return ok;
  }, [activeAddress]);

  const loadRoyaltyInitial = useCallback(async () => {
    if (!activeAddress) return false;
    setRoyaltyLoading(true);
    setRoyaltyError(null);
    let ok = false;
    try {
      const { items, nextStartId } = await getRoyaltyReceiptsPaged(
        activeAddress,
        null,
        10
      );
      setRoyaltyReceipts(items);
      setRoyaltyNextStart(nextStartId);
      ok = true;
    } catch (err) {
      console.error(err);
      setRoyaltyError("Failed to load royalty receipts from Stacks mainnet.");
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
      setCreatedNextStart(null);
      setCreatedLoading(false);
      setCreatedLoadingMore(false);
      setCreatedError(null);
      setRoyaltyReceipts([]);
      setRoyaltyNextStart(null);
      setRoyaltyLoading(false);
      setRoyaltyLoadingMore(false);
      setRoyaltyError(null);
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
        setCreatedError(null);
        setCreatedLoading(true);
        const ok = await loadCreatedInitial();
        if (ok) markSuccess();
        setCreatedLoading(false);
      });
      return;
    }
    runWithCooldown(async () => {
      setRoyaltyError(null);
      setRoyaltyLoading(true);
      const ok = await loadRoyaltyInitial();
      if (ok) markSuccess();
      setRoyaltyLoading(false);
    });
  };

  const validateStacksAddress = (addr: string) => {
    const trimmed = addr.trim();
    return trimmed.length >= 30 && trimmed.startsWith("S");
  };

  const handleTransfer = async (receipt: Receipt) => {
    if (!activeAddress || receipt.owner !== activeAddress) return;
    const input = transferInputs[receipt.id] ?? "";
    if (!validateStacksAddress(input)) {
      setTransferErrors((prev) => ({
        ...prev,
        [receipt.id]:
          "Enter a valid Stacks address (starts with 'S' and looks complete).",
      }));
      return;
    }
    setTransferErrors((prev) => ({ ...prev, [receipt.id]: "" }));
    setTransferSuccess((prev) => ({ ...prev, [receipt.id]: "" }));
    setTransferring((prev) => ({ ...prev, [receipt.id]: true }));
    try {
      await transferReceipt(receipt.id, input.trim());
      setTransferInputs((prev) => ({ ...prev, [receipt.id]: "" }));
      setTransferSuccess((prev) => ({
        ...prev,
        [receipt.id]:
          "Transfer submitted. Once confirmed on-chain, this receipt will move to the new owner.",
      }));
      await loadOwnedInitial();
    } catch (err) {
      console.error("Transfer failed", err);
      setTransferErrors((prev) => ({
        ...prev,
        [receipt.id]:
          "Transfer failed. Please check that you are the current owner, the recipient address is correct, and you have enough STX for the royalty fee.",
      }));
    } finally {
      setTransferring((prev) => ({ ...prev, [receipt.id]: false }));
    }
  };

  const handleRoyaltyUpdate = async (receipt: Receipt) => {
    if (!activeAddress || receipt.creator !== activeAddress) return;
    const input = royaltyInputs[receipt.id] ?? "";
    if (!validateStacksAddress(input)) {
      setRoyaltyErrors((prev) => ({
        ...prev,
        [receipt.id]:
          "Enter a valid Stacks address (starts with 'S' and looks complete).",
      }));
      return;
    }
    setRoyaltyErrors((prev) => ({ ...prev, [receipt.id]: "" }));
    setRoyaltySuccess((prev) => ({ ...prev, [receipt.id]: "" }));
    setRoyaltyUpdating((prev) => ({ ...prev, [receipt.id]: true }));
    try {
      await setReceiptRoyaltyRecipient(receipt.id, input.trim());
      setRoyaltyInputs((prev) => ({ ...prev, [receipt.id]: "" }));
      setRoyaltySuccess((prev) => ({
        ...prev,
        [receipt.id]:
          "Royalty recipient updated. New transfers will pay royalties to this address.",
      }));
      await loadRoyaltyInitial();
    } catch (err) {
      console.error("Updating royalty recipient failed", err);
      setRoyaltyErrors((prev) => ({
        ...prev,
        [receipt.id]:
          "Updating royalty recipient failed. Please check that you are the creator and that the new address is valid.",
      }));
    } finally {
      setRoyaltyUpdating((prev) => ({ ...prev, [receipt.id]: false }));
    }
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

  const handleLoadMoreCreated = async () => {
    if (!activeAddress || createdNextStart === null) return;
    runWithCooldown(async () => {
      setCreatedLoadingMore(true);
      setCreatedError(null);
      try {
        const { items, nextStartId } = await getCreatedReceiptsPaged(
          activeAddress,
          createdNextStart,
          10
        );
        setCreatedReceipts((prev) => [...prev, ...items]);
        setCreatedNextStart(nextStartId);
        markSuccess();
      } catch (err) {
        console.error(err);
        setCreatedError("Failed to load more created receipts.");
      } finally {
        setCreatedLoadingMore(false);
      }
    });
  };

  const handleLoadMoreRoyalty = async () => {
    if (!activeAddress || royaltyNextStart === null) return;
    runWithCooldown(async () => {
      setRoyaltyLoadingMore(true);
      try {
        const { items, nextStartId } = await getRoyaltyReceiptsPaged(
          activeAddress,
          royaltyNextStart,
          10
        );
        setRoyaltyReceipts((prev) => [...prev, ...items]);
        setRoyaltyNextStart(nextStartId);
        markSuccess();
      } catch (err) {
        console.error(err);
        setRoyaltyError("Failed to load more royalty receipts.");
      } finally {
        setRoyaltyLoadingMore(false);
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
              className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40">
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
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Owned
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("created")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "created"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Created
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("royalty")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "royalty"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
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
                milliseconds and when done will loading on-chain data...
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                  Your Owned Receipts
                </p>

                {activeLoading && (
                  <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Loading on-chain receipts...
                  </div>
                )}

                {!isLoading &&
                  !error &&
                  activeTab === "owned" &&
                  !hasOwned &&
                  hasTotal && (
                    <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                      There are{" "}
                      <span className="font-mono">
                        {totalOnChain} receipt{totalOnChain === 1 ? "" : "s"}
                      </span>{" "}
                      , but none are owned by you.
                    </div>
                  )}
              </div>

              {error && activeTab === "owned" && (
                <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              {createdError && activeTab === "created" && (
                <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {createdError}
                </div>
              )}
              {royaltyError && activeTab === "royalty" && (
                <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {royaltyError}
                </div>
              )}

              {!isLoading &&
                !createdError &&
                activeTab === "created" &&
                !hasCreated &&
                hasTotal && (
                  <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
                    There are{" "}
                    <span className="font-mono">
                      {totalOnChain} receipt{totalOnChain === 1 ? "" : "s"}
                    </span>{" "}
                    on this contract, but none were created by this wallet yet.
                    Stamp your first receipt on the home page.
                  </div>
                )}

              {!isLoading && !error && !createdError && !hasTotal && (
                <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
                  No receipts exist on this contract yet. Be the first one to
                  stamp a Receipt of Life on the home page.
                </div>
              )}

              {activeTab === "royalty" && !royaltyError && (
                <p className="text-xs text-neutral-700">
                  Receipts where you are the current royalty recipient.
                </p>
              )}

              {!isLoading &&
                !royaltyError &&
                activeTab === "royalty" &&
                !hasRoyalty &&
                hasTotal && (
                  <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
                    No receipts are currently sending royalties to this address.
                  </div>
                )}

              {!isLoading && !error && activeTab === "owned" && hasOwned && (
                <ul className="space-y-3">
                  {ownedReceipts.map((r) => {
                    const date = new Date(r.createdAt * 1000);
                    return (
                      <li
                        key={r.id}
                        className="rounded-xl border border-black bg-white p-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                            Receipt #{r.id}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {date.toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap wrap-break-word text-neutral-900">
                          {r.text}
                        </p>
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
                        {activeAddress === r.owner && activeTab === "owned" && (
                          <div className="mt-4 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-700">
                              Actions · Transfer
                            </p>
                            <input
                              type="text"
                              value={transferInputs[r.id] ?? ""}
                              onChange={(e) =>
                                setTransferInputs((prev) => ({
                                  ...prev,
                                  [r.id]: e.target.value,
                                }))
                              }
                              placeholder="S…"
                              className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                            />
                            {transferErrors[r.id] && (
                              <p className="text-[11px] text-red-700">
                                {transferErrors[r.id]}
                              </p>
                            )}
                            {transferSuccess[r.id] && (
                              <p className="text-[11px] text-green-700">
                                {transferSuccess[r.id]}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleTransfer(r)}
                              disabled={!!transferring[r.id]}
                              className="rounded-full border border-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                              {transferring[r.id]
                                ? "Transferring…"
                                : "Confirm transfer"}
                            </button>
                          </div>
                        )}
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
              {!isLoading &&
                !createdError &&
                activeTab === "created" &&
                hasCreated && (
                  <ul className="space-y-3">
                    <li className="text-[11px]">
                      <span className="rounded-full border border-black bg-neutral-50 px-2 py-1">
                        Created · {createdReceipts.length} receipt
                        {createdReceipts.length > 1 ? "s" : ""}
                      </span>
                    </li>
                    {createdReceipts.map((r) => {
                      const date = new Date(r.createdAt * 1000);
                      return (
                        <li
                          key={r.id}
                          className="rounded-xl border border-black bg-white p-4 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                              Receipt #{r.id}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {date.toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-neutral-900">
                            {r.text}
                          </p>
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
                    {createdNextStart !== null && (
                      <li>
                        <button
                          type="button"
                          onClick={handleLoadMoreCreated}
                          disabled={createdLoadingMore}
                          className="rounded-full border border-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                          {createdLoadingMore ? "Loading…" : "Load more"}
                        </button>
                      </li>
                    )}
                  </ul>
                )}

              {!isLoading &&
                !royaltyError &&
                activeTab === "royalty" &&
                hasRoyalty && (
                  <ul className="space-y-3">
                    <li className="text-[11px]">
                      <span className="rounded-full border border-black bg-neutral-50 px-2 py-1">
                        Royalty · {royaltyReceipts.length} receipt
                        {royaltyReceipts.length > 1 ? "s" : ""}
                      </span>
                    </li>
                    {royaltyReceipts.map((r) => {
                      const date = new Date(r.createdAt * 1000);
                      return (
                        <li
                          key={r.id}
                          className="rounded-xl border border-black bg-white p-4 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                              Receipt #{r.id}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {date.toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-neutral-900">
                            {r.text}
                          </p>
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
                            {activeAddress === r.creator && (
                              <div className="mt-4 w-full space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-700">
                                  Actions · Update royalty recipient
                                </p>
                                <input
                                  type="text"
                                  value={royaltyInputs[r.id] ?? ""}
                                  onChange={(e) =>
                                    setRoyaltyInputs((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="S…"
                                  className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                                />
                                {royaltyErrors[r.id] && (
                                  <p className="text-[11px] text-red-700">
                                    {royaltyErrors[r.id]}
                                  </p>
                                )}
                                {royaltySuccess[r.id] && (
                                  <p className="text-[11px] text-green-700">
                                    {royaltySuccess[r.id]}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRoyaltyUpdate(r)}
                                  disabled={!!royaltyUpdating[r.id]}
                                  className="rounded-full border border-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                                  {royaltyUpdating[r.id] ? "Saving…" : "Save"}
                                </button>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {royaltyNextStart !== null && (
                      <li>
                        <button
                          type="button"
                          onClick={handleLoadMoreRoyalty}
                          disabled={royaltyLoadingMore}
                          className="rounded-full border border-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                          {royaltyLoadingMore ? "Loading…" : "Load more"}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
