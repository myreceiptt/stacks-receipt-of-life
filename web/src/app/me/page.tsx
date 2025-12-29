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
  transferReceipt,
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
  const [createdWindowStart, setCreatedWindowStart] = useState<number | null>(
    null
  );
  const [createdHasMore, setCreatedHasMore] = useState(false);
  const [createdLoading, setCreatedLoading] = useState(false);
  const [createdLoadingMore, setCreatedLoadingMore] = useState(false);
  const [createdError, setCreatedError] = useState<string | null>(null);

  const [royaltyReceipts, setRoyaltyReceipts] = useState<Receipt[]>([]);
  const [royaltyLoading, setRoyaltyLoading] = useState(false);

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
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const hasOwned = ownedReceipts.length > 0;
  const hasCreated = createdReceipts.length > 0;
  const hasTotal = typeof totalOnChain === "number" && totalOnChain > 0;
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
      : false;
  const ownedPageSize = 10;
  const createdPageSize = 10;

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

  const fetchCreatedWindow = useCallback(
    async (start: number) => {
      if (!activeAddress) {
        return { items: [] as Receipt[], startUsed: 1 };
      }
      let currentStart = start;
      while (true) {
        const { items } = await getCreatedReceiptsPaged(
          activeAddress,
          BigInt(currentStart),
          createdPageSize
        );
        if (items.length > 0 || currentStart === 1) {
          const ordered = [...items].sort((a, b) => b.id - a.id);
          return { items: ordered, startUsed: currentStart };
        }
        const nextStart = Math.max(1, currentStart - createdPageSize);
        if (nextStart === currentStart) {
          return { items: [] as Receipt[], startUsed: currentStart };
        }
        currentStart = nextStart;
      }
    },
    [activeAddress, createdPageSize]
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
      setError("Failed to load your receipts. Please try again later.");
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
      if (total === 0) {
        setTotalOnChain(0);
        setCreatedReceipts([]);
        setCreatedWindowStart(null);
        setCreatedHasMore(false);
        ok = true;
        return ok;
      }
      const initialStart = Math.max(1, total - (createdPageSize - 1));
      const { items, startUsed } = await fetchCreatedWindow(initialStart);
      setTotalOnChain(total);
      setCreatedReceipts(items);
      setCreatedWindowStart(startUsed);
      setCreatedHasMore(startUsed > 1);
      ok = true;
    } catch (err) {
      console.error(err);
      setCreatedError("Failed to load created receipts from Stacks mainnet.");
    } finally {
      setCreatedLoading(false);
    }
    return ok;
  }, [activeAddress, createdPageSize, fetchCreatedWindow]);

  const loadRoyaltyInitial = useCallback(async () => {
    if (!activeAddress) return false;
    setRoyaltyLoading(true);
    let ok = false;
    try {
      const { items } = await getRoyaltyReceiptsPaged(activeAddress, null, 10);
      setRoyaltyReceipts(items);
      ok = true;
    } catch (err) {
      console.error(err);
    } finally {
      setRoyaltyLoading(false);
    }
    return ok;
  }, [activeAddress]);

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
      runWithCooldown(async () => {
        const ok = await loadOwnedInitial();
        if (ok) markSuccess();
      });
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
      setCreatedWindowStart(null);
      setCreatedHasMore(false);
      setCreatedLoading(false);
      setCreatedLoadingMore(false);
      setCreatedError(null);
      setRoyaltyReceipts([]);
      setRoyaltyLoading(false);
      setTotalOnChain(null);
      setError(null);
      setTransferInputs({});
      setTransferErrors({});
      setTransferSuccess({});
      setTransferring({});
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
        setError("Failed to load your receipts. Please try again later.");
      } finally {
        setOwnedLoadingMore(false);
      }
    });
  };

  const handleLoadMoreCreated = async () => {
    if (!activeAddress || !createdWindowStart || !createdHasMore) return;
    runWithCooldown(async () => {
      setCreatedLoadingMore(true);
      try {
        const nextStart = Math.max(1, createdWindowStart - createdPageSize);
        const { items, startUsed } = await fetchCreatedWindow(nextStart);
        setCreatedReceipts((prev) => [...prev, ...items]);
        setCreatedWindowStart(startUsed);
        setCreatedHasMore(startUsed > 1);
        markSuccess();
      } catch (err) {
        console.error(err);
        setCreatedError("Failed to load created receipts. Please try again.");
      } finally {
        setCreatedLoadingMore(false);
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
              className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
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
                  ? "Receipts You Owned"
                  : activeTab === "created"
                  ? "Receipts You Created"
                  : "Royalty Receipts"}
              </p>
              <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                Cooling down for {Math.max(0, Math.ceil(remainingMs))}{" "}
                milliseconds and then loading on-chain data...
              </div>
            </div>
          ) : (
            <>
              {activeTab === "owned" && (
                <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    Receipts You Owned
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
                    <>
                      <ul className="list-disc space-y-3 pl-4 text-sm text-neutral-800">
                        {ownedReceipts.map((r) => {
                          const date = new Date(r.createdAt * 1000);
                          return (
                            <li key={r.id} className="pl-1">
                              <div className="font-semibold">
                                You Owned:{" "}
                                <span
                                  onClick={() => setSelectedReceipt(r)}
                                  className="uppercase underline cursor-pointer">
                                  Receipt #{r.id}
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-neutral-500">
                                {date.toLocaleString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="mt-1 text-[11px] text-neutral-600">
                                Creator:{" "}
                                <a
                                  href={`https://explorer.stacks.co/address/${r.creator}?chain=mainnet`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline">
                                  {r.creator.slice(0, 7)} ...{" "}
                                  {r.creator.slice(-4)}
                                </a>{" "}
                                <span className="font-mono">
                                  (View on Explorer)
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-neutral-600">
                                Royalty to:{" "}
                                <a
                                  href={`https://explorer.stacks.co/address/${r.royaltyRecipient}?chain=mainnet`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline">
                                  {r.royaltyRecipient.slice(0, 7)} ...{" "}
                                  {r.royaltyRecipient.slice(-4)}
                                </a>{" "}
                                <span className="font-mono">
                                  (View on Explorer)
                                </span>
                              </div>
                              {activeAddress === r.owner && (
                                <>
                                  <div className="mt-3 flex flex-col gap-1">
                                    <label className="text-[11px] uppercase tracking-[0.18em]">
                                      Transfer to new owner
                                    </label>
                                    <input
                                      type="text"
                                      value={transferInputs[r.id] ?? ""}
                                      onChange={(e) =>
                                        setTransferInputs((prev) => ({
                                          ...prev,
                                          [r.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="S..."
                                      className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                                    />
                                  </div>
                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
                                    <span>
                                      This will be stored on-chain and linked to
                                      your STX address.
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleTransfer(r)}
                                    disabled={!!transferring[r.id]}
                                    className="mt-3 rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-50">
                                    {transferring[r.id]
                                      ? "Transferring…"
                                      : "Confirm transfer"}
                                  </button>
                                  {transferErrors[r.id] && (
                                    <div className="mt-3 rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                                      {transferErrors[r.id]}
                                    </div>
                                  )}
                                  {transferSuccess[r.id] && (
                                    <div className="mt-3 rounded-md border border-green-500 bg-green-50 px-3 py-2 text-xs text-green-700">
                                      {transferSuccess[r.id]}
                                    </div>
                                  )}
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {ownedHasMore ? (
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={handleLoadMoreOwned}
                            disabled={ownedLoadingMore}
                            className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                            {ownedLoadingMore ? "Loading..." : "Load more"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="rounded-full border border-black bg-neutral-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                            Owned: {ownedReceipts.length} receipt
                            {ownedReceipts.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {activeTab === "created" && (
                <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    Receipts You Created
                  </p>

                  {activeLoading && (
                    <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                      Loading on-chain receipts...
                    </div>
                  )}

                  {createdError && (
                    <div className="rounded-md border border-dashed border-red-400 bg-red-50 p-3 text-sm text-red-700">
                      {createdError}
                    </div>
                  )}

                  {!isLoading && !createdError && !hasCreated && hasTotal && (
                    <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                      There are{" "}
                      <span className="font-mono">
                        {totalOnChain} receipt{totalOnChain === 1 ? "" : "s"}
                      </span>{" "}
                      , but none were created by you.
                    </div>
                  )}

                  {!isLoading && !createdError && hasCreated && (
                    <>
                      <ul className="list-disc space-y-3 pl-4 text-sm text-neutral-800">
                        {createdReceipts.map((r) => {
                          const date = new Date(r.createdAt * 1000);
                          return (
                            <li key={r.id} className="pl-1">
                              <div className="font-semibold">
                                You Created:{" "}
                                <span
                                  onClick={() => setSelectedReceipt(r)}
                                  className="uppercase underline cursor-pointer">
                                  Receipt #{r.id}
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-neutral-500">
                                {date.toLocaleString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="mt-1 text-[11px] text-neutral-600">
                                Owner:{" "}
                                <a
                                  href={`https://explorer.stacks.co/address/${r.owner}?chain=mainnet`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline">
                                  {r.owner.slice(0, 7)} ... {r.owner.slice(-4)}
                                </a>{" "}
                                <span className="font-mono">
                                  (View on Explorer)
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-neutral-600">
                                Royalty to:{" "}
                                <a
                                  href={`https://explorer.stacks.co/address/${r.royaltyRecipient}?chain=mainnet`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline">
                                  {r.royaltyRecipient.slice(0, 7)} ...{" "}
                                  {r.royaltyRecipient.slice(-4)}
                                </a>{" "}
                                <span className="font-mono">
                                  (View on Explorer)
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {createdHasMore ? (
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={handleLoadMoreCreated}
                            disabled={createdLoadingMore}
                            className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                            {createdLoadingMore ? "Loading..." : "Load more"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="rounded-full border border-black bg-neutral-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                            Created: {createdReceipts.length} receipt
                            {createdReceipts.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
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
