"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useCooldown } from "@/hooks/use-cooldown";
import { useAppKitAccount } from "@reown/appkit/react";
import { ReceiptModal } from "@/components/receipt-modal";
import { OwnedTab } from "@/components/tab/owned";
import { CreatedTab } from "@/components/tab/created";
import { RoyaltyTab } from "@/components/tab/royalty";
import {
  getLastId,
  getOwnedReceiptsPaged,
  getCreatedReceiptsPaged,
  getRoyaltyReceiptsPaged,
  setReceiptRoyaltyRecipient,
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
  const [royaltyWindowStart, setRoyaltyWindowStart] = useState<number | null>(
    null
  );
  const [royaltyHasMore, setRoyaltyHasMore] = useState(false);
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
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const hasOwned = ownedReceipts.length > 0;
  const hasCreated = createdReceipts.length > 0;
  const hasRoyalty = royaltyReceipts.length > 0;
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
      : royaltyLoadingMore;
  const ownedPageSize = 10;
  const createdPageSize = 10;
  const royaltyPageSize = 10;

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

  const fetchRoyaltyWindow = useCallback(
    async (start: number) => {
      if (!activeAddress) {
        return { items: [] as Receipt[], startUsed: 1 };
      }
      let currentStart = start;
      while (true) {
        const { items } = await getRoyaltyReceiptsPaged(
          activeAddress,
          BigInt(currentStart),
          royaltyPageSize
        );
        if (items.length > 0 || currentStart === 1) {
          const ordered = [...items].sort((a, b) => b.id - a.id);
          return { items: ordered, startUsed: currentStart };
        }
        const nextStart = Math.max(1, currentStart - royaltyPageSize);
        if (nextStart === currentStart) {
          return { items: [] as Receipt[], startUsed: currentStart };
        }
        currentStart = nextStart;
      }
    },
    [activeAddress, royaltyPageSize]
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
    setRoyaltyError(null);
    let ok = false;
    try {
      const total = await getLastId();
      if (total === 0) {
        setTotalOnChain(0);
        setRoyaltyReceipts([]);
        setRoyaltyWindowStart(null);
        setRoyaltyHasMore(false);
        ok = true;
        return ok;
      }
      const initialStart = Math.max(1, total - (royaltyPageSize - 1));
      const { items, startUsed } = await fetchRoyaltyWindow(initialStart);
      setRoyaltyReceipts(items);
      setRoyaltyWindowStart(startUsed);
      setRoyaltyHasMore(startUsed > 1);
      ok = true;
    } catch (err) {
      console.error(err);
      setRoyaltyError("Failed to load royalty receipts from Stacks mainnet.");
    } finally {
      setRoyaltyLoading(false);
    }
    return ok;
  }, [activeAddress, fetchRoyaltyWindow, royaltyPageSize]);

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
      runWithCooldown(async () => {
        const ok = await loadRoyaltyInitial();
        if (ok) markSuccess();
      });
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
      setRoyaltyWindowStart(null);
      setRoyaltyHasMore(false);
      setRoyaltyLoading(false);
      setRoyaltyLoadingMore(false);
      setRoyaltyError(null);
      setTotalOnChain(null);
      setError(null);
      setTransferInputs({});
      setTransferErrors({});
      setTransferSuccess({});
      setTransferring({});
      setRoyaltyInputs({});
      setRoyaltyErrors({});
      setRoyaltySuccess({});
      setRoyaltyUpdating({});
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

  const handleLoadMoreRoyalty = async () => {
    if (!activeAddress || !royaltyWindowStart || !royaltyHasMore) return;
    runWithCooldown(async () => {
      setRoyaltyLoadingMore(true);
      try {
        const nextStart = Math.max(1, royaltyWindowStart - royaltyPageSize);
        const { items, startUsed } = await fetchRoyaltyWindow(nextStart);
        setRoyaltyReceipts((prev) => [...prev, ...items]);
        setRoyaltyWindowStart(startUsed);
        setRoyaltyHasMore(startUsed > 1);
        markSuccess();
      } catch (err) {
        console.error(err);
        setRoyaltyError("Failed to load royalty receipts. Please try again.");
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
                <OwnedTab
                  ownedReceipts={ownedReceipts}
                  activeLoading={activeLoading}
                  error={error}
                  isLoading={isLoading}
                  hasOwned={hasOwned}
                  hasTotal={hasTotal}
                  totalOnChain={totalOnChain}
                  activeAddress={activeAddress}
                  transferInputs={transferInputs}
                  transferErrors={transferErrors}
                  transferSuccess={transferSuccess}
                  transferring={transferring}
                  ownedHasMore={ownedHasMore}
                  ownedLoadingMore={ownedLoadingMore}
                  onSelectReceipt={setSelectedReceipt}
                  onTransferInputChange={(id, value) =>
                    setTransferInputs((prev) => ({ ...prev, [id]: value }))
                  }
                  onTransfer={handleTransfer}
                  onLoadMore={handleLoadMoreOwned}
                />
              )}
              {activeTab === "created" && (
                <CreatedTab
                  createdReceipts={createdReceipts}
                  activeLoading={activeLoading}
                  createdError={createdError}
                  isLoading={isLoading}
                  hasCreated={hasCreated}
                  hasTotal={hasTotal}
                  totalOnChain={totalOnChain}
                  createdHasMore={createdHasMore}
                  createdLoadingMore={createdLoadingMore}
                  onSelectReceipt={setSelectedReceipt}
                  onLoadMore={handleLoadMoreCreated}
                />
              )}
              {activeTab === "royalty" && (
                <RoyaltyTab
                  royaltyReceipts={royaltyReceipts}
                  activeLoading={activeLoading}
                  royaltyError={royaltyError}
                  isLoading={isLoading}
                  hasRoyalty={hasRoyalty}
                  hasTotal={hasTotal}
                  totalOnChain={totalOnChain}
                  royaltyHasMore={royaltyHasMore}
                  royaltyLoadingMore={royaltyLoadingMore}
                  activeAddress={activeAddress}
                  royaltyInputs={royaltyInputs}
                  royaltyErrors={royaltyErrors}
                  royaltySuccess={royaltySuccess}
                  royaltyUpdating={royaltyUpdating}
                  onSelectReceipt={setSelectedReceipt}
                  onRoyaltyInputChange={(id, value) =>
                    setRoyaltyInputs((prev) => ({ ...prev, [id]: value }))
                  }
                  onRoyaltyUpdate={handleRoyaltyUpdate}
                  onLoadMore={handleLoadMoreRoyalty}
                />
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
