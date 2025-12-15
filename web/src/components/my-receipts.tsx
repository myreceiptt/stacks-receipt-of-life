"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import {
  getLastId,
  getOwnedReceiptsPaged,
  getCreatedReceiptsPaged,
  getRoyaltyReceiptsPaged,
  getActivityReceiptsPaged,
  transferReceipt,
  setReceiptRoyaltyRecipient,
  type Receipt,
} from "@/lib/receipt-contract";

export function MyReceipts() {
  const { address } = useWallet();
  const [ownedReceipts, setOwnedReceipts] = useState<Receipt[]>([]);
  const [ownedNextStart, setOwnedNextStart] = useState<bigint | null>(null);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedLoadingMore, setOwnedLoadingMore] = useState(false);

  const [createdReceipts, setCreatedReceipts] = useState<Receipt[]>([]);
  const [createdNextStart, setCreatedNextStart] = useState<bigint | null>(null);
  const [createdLoading, setCreatedLoading] = useState(false);
  const [createdLoadingMore, setCreatedLoadingMore] = useState(false);

  const [royaltyReceipts, setRoyaltyReceipts] = useState<Receipt[]>([]);
  const [royaltyNextStart, setRoyaltyNextStart] = useState<bigint | null>(null);
  const [royaltyLoading, setRoyaltyLoading] = useState(false);
  const [royaltyLoadingMore, setRoyaltyLoadingMore] = useState(false);
  const [royaltyError, setRoyaltyError] = useState<string | null>(null);

  const [activityReceipts, setActivityReceipts] = useState<Receipt[]>([]);
  const [activityNextHighest, setActivityNextHighest] = useState<bigint | null>(
    null
  );
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [totalOnChain, setTotalOnChain] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "owned" | "created" | "royalty" | "activity"
  >("owned");
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
  const hasActivity = activityReceipts.length > 0;
  const isLoading =
    ownedLoading || createdLoading || royaltyLoading || activityLoading;
  const isRefreshing =
    ownedLoadingMore ||
    createdLoadingMore ||
    royaltyLoadingMore ||
    activityLoadingMore;

  const loadOwnedInitial = useCallback(async () => {
    if (!address) return;
    setOwnedLoading(true);
    setError(null);
    try {
      const total = await getLastId();
      const { items, nextStartId } = await getOwnedReceiptsPaged(
        address,
        null,
        10
      );
      setTotalOnChain(total);
      setOwnedReceipts(items);
      setOwnedNextStart(nextStartId);
    } catch (err) {
      console.error(err);
      setError("Failed to load receipts from Stacks mainnet.");
    } finally {
      setOwnedLoading(false);
    }
  }, [address]);

  const loadCreatedInitial = useCallback(async () => {
    if (!address) return;
    setCreatedLoading(true);
    setError(null);
    try {
      const total = await getLastId();
      const { items, nextStartId } = await getCreatedReceiptsPaged(
        address,
        null,
        10
      );
      setTotalOnChain(total);
      setCreatedReceipts(items);
      setCreatedNextStart(nextStartId);
    } catch (err) {
      console.error(err);
      setError("Failed to load receipts from Stacks mainnet.");
    } finally {
      setCreatedLoading(false);
    }
  }, [address]);

  const loadRoyaltyInitial = useCallback(async () => {
    if (!address) return;
    setRoyaltyLoading(true);
    setRoyaltyError(null);
    try {
      const { items, nextStartId } = await getRoyaltyReceiptsPaged(
        address,
        null,
        10
      );
      setRoyaltyReceipts(items);
      setRoyaltyNextStart(nextStartId);
    } catch (err) {
      console.error(err);
      setRoyaltyError("Failed to load royalty receipts from Stacks mainnet.");
    } finally {
      setRoyaltyLoading(false);
    }
  }, [address]);

  const loadActivityInitial = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const { items, nextHighestId } = await getActivityReceiptsPaged(null, 10);
      setActivityReceipts(items);
      setActivityNextHighest(nextHighestId);
    } catch (err) {
      console.error(err);
      setActivityError("Failed to load activity from Stacks mainnet.");
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    loadOwnedInitial();
    loadCreatedInitial();
  }, [address, loadOwnedInitial, loadCreatedInitial]);

  useEffect(() => {
    if (!address) return;
    if (
      activeTab === "royalty" &&
      royaltyReceipts.length === 0 &&
      !royaltyLoading
    ) {
      loadRoyaltyInitial();
    }
    if (
      activeTab === "activity" &&
      activityReceipts.length === 0 &&
      !activityLoading
    ) {
      loadActivityInitial();
    }
  }, [
    activeTab,
    address,
    royaltyReceipts.length,
    royaltyLoading,
    loadRoyaltyInitial,
    activityReceipts.length,
    activityLoading,
    loadActivityInitial,
  ]);

  // Reset data when disconnecting
  useEffect(() => {
    if (!address) {
      setOwnedReceipts([]);
      setOwnedNextStart(null);
      setOwnedLoading(false);
      setOwnedLoadingMore(false);
      setCreatedReceipts([]);
      setCreatedNextStart(null);
      setCreatedLoading(false);
      setCreatedLoadingMore(false);
      setRoyaltyReceipts([]);
      setRoyaltyNextStart(null);
      setRoyaltyLoading(false);
      setRoyaltyLoadingMore(false);
      setRoyaltyError(null);
      setActivityReceipts([]);
      setActivityNextHighest(null);
      setActivityLoading(false);
      setActivityLoadingMore(false);
      setActivityError(null);
      setTotalOnChain(null);
      setError(null);
    }
  }, [address]);

  const handleRefresh = async () => {
    if (!address) return;
    setOwnedLoading(true);
    setCreatedLoading(true);
    if (activeTab === "royalty") {
      setRoyaltyLoading(true);
    }
    if (activeTab === "activity") {
      setActivityLoading(true);
    }
    await Promise.all([
      loadOwnedInitial(),
      loadCreatedInitial(),
      activeTab === "royalty" ? loadRoyaltyInitial() : Promise.resolve(),
      activeTab === "activity" ? loadActivityInitial() : Promise.resolve(),
    ]);
    setOwnedLoading(false);
    setCreatedLoading(false);
    setRoyaltyLoading(false);
    setActivityLoading(false);
  };

  const refreshAfterAction = async () => {
    if (!address) return;
    await Promise.all([loadOwnedInitial(), loadCreatedInitial()]);
  };

  const validateStacksAddress = (addr: string) => {
    const trimmed = addr.trim();
    return trimmed.length >= 30 && trimmed.startsWith("S");
  };

  const handleTransfer = async (receipt: Receipt) => {
    if (!address || receipt.owner !== address) return;
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
      await refreshAfterAction();
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
    if (!address || receipt.creator !== address) return;
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
      await refreshAfterAction();
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
    if (!address || ownedNextStart === null) return;
    setOwnedLoadingMore(true);
    try {
      const { items, nextStartId } = await getOwnedReceiptsPaged(
        address,
        ownedNextStart,
        10
      );
      setOwnedReceipts((prev) => [...prev, ...items]);
      setOwnedNextStart(nextStartId);
    } catch (err) {
      console.error(err);
      setError("Failed to load more owned receipts.");
    } finally {
      setOwnedLoadingMore(false);
    }
  };

  const handleLoadMoreCreated = async () => {
    if (!address || createdNextStart === null) return;
    setCreatedLoadingMore(true);
    try {
      const { items, nextStartId } = await getCreatedReceiptsPaged(
        address,
        createdNextStart,
        10
      );
      setCreatedReceipts((prev) => [...prev, ...items]);
      setCreatedNextStart(nextStartId);
    } catch (err) {
      console.error(err);
      setError("Failed to load more created receipts.");
    } finally {
      setCreatedLoadingMore(false);
    }
  };

  const handleLoadMoreRoyalty = async () => {
    if (!address || royaltyNextStart === null) return;
    setRoyaltyLoadingMore(true);
    try {
      const { items, nextStartId } = await getRoyaltyReceiptsPaged(
        address,
        royaltyNextStart,
        10
      );
      setRoyaltyReceipts((prev) => [...prev, ...items]);
      setRoyaltyNextStart(nextStartId);
    } catch (err) {
      console.error(err);
      setRoyaltyError("Failed to load more royalty receipts.");
    } finally {
      setRoyaltyLoadingMore(false);
    }
  };

  const handleLoadMoreActivity = async () => {
    if (activityNextHighest === null) return;
    setActivityLoadingMore(true);
    try {
      const { items, nextHighestId } = await getActivityReceiptsPaged(
        activityNextHighest,
        10
      );
      setActivityReceipts((prev) => [...prev, ...items]);
      setActivityNextHighest(nextHighestId);
    } catch (err) {
      console.error(err);
      setActivityError("Failed to load more activity.");
    } finally {
      setActivityLoadingMore(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
              My Receipts · on-chain
            </p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
              Your Receipt/s on Stacks.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {address && (
              <span className="rounded-full border border-black bg-white px-3 py-1 font-mono">
                {address.slice(0, 8)}…{address.slice(-4)}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={!address || isLoading}
              className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40">
              {isRefreshing || isLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          This page shows your on-chain Receipts of Life stamped with the
          connected Stacks wallet on mainnet. You can see NOTAs you own and
          NOTAs you created. Each receipt is a small proof that you were paying
          attention to your own life.
        </p>
      </header>

      {!address && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar to see your receipts.
        </div>
      )}

      {address && (
        <div className="space-y-4">
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
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "activity"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Activity
            </button>
          </div>

          {isLoading && (
            <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
              Loading receipts from Stacks mainnet…
            </div>
          )}

          {error && activeTab !== "royalty" && (
            <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {royaltyError && activeTab === "royalty" && (
            <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
              {royaltyError}
            </div>
          )}
          {activityError && activeTab === "activity" && (
            <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
              {activityError}
            </div>
          )}

          {!isLoading &&
            !error &&
            activeTab === "owned" &&
            !hasOwned &&
            hasTotal && (
              <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
                There are{" "}
                <span className="font-mono">
                  {totalOnChain} receipt{totalOnChain === 1 ? "" : "s"}
                </span>{" "}
                on this contract, but none are owned by this wallet yet. Stamp
                your first receipt on the home page.
              </div>
            )}

          {!isLoading &&
            !error &&
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

          {!isLoading && !error && !hasTotal && (
            <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
              No receipts exist on this contract yet. Be the first one to stamp
              a Receipt of Life on the home page.
            </div>
          )}

          {activeTab === "royalty" && !royaltyError && (
            <p className="text-xs text-neutral-700">
              Receipts where you are the current royalty recipient.
            </p>
          )}
          {activeTab === "activity" && !activityError && (
            <p className="text-xs text-neutral-700">
              Recent receipts on this contract (newest first).
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

          {!isLoading &&
            !activityError &&
            activeTab === "activity" &&
            !hasActivity && (
              <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
                No receipt activity has been recorded yet.
              </div>
            )}

          {!isLoading && !error && activeTab === "owned" && hasOwned && (
            <ul className="space-y-3">
              <li className="text-[11px]">
                <span className="rounded-full border border-black bg-neutral-50 px-2 py-1">
                  Owned · {ownedReceipts.length} receipt
                  {ownedReceipts.length > 1 ? "s" : ""}
                </span>
              </li>
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
                    <p className="mt-2 whitespace-pre-wrap break-words text-neutral-900">
                      {r.text}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                      <span className="font-mono break-words">
                        Creator: {r.creator.slice(0, 8)}…{r.creator.slice(-4)}
                      </span>
                      <a
                        href={`https://explorer.stacks.co/address/${r.creator}?chain=mainnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline">
                        View creator
                      </a>
                      <span className="font-mono break-words">
                        Owner: {r.owner.slice(0, 8)}…{r.owner.slice(-4)}
                      </span>
                      <a
                        href={`https://explorer.stacks.co/address/${r.owner}?chain=mainnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline">
                        View owner
                      </a>
                      <span className="font-mono break-words">
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
                      {address &&
                        (r.creator === address ||
                          r.owner === address ||
                          r.royaltyRecipient === address) && (
                          <span className="rounded-full border border-black px-2 py-1">
                            You are involved
                          </span>
                        )}
                    </div>
                    {address === r.owner && activeTab === "owned" && (
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
              {ownedNextStart !== null && (
                <li>
                  <button
                    type="button"
                    onClick={handleLoadMoreOwned}
                    disabled={ownedLoadingMore}
                    className="rounded-full border border-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                    {ownedLoadingMore ? "Loading…" : "Load more"}
                  </button>
                </li>
              )}
            </ul>
          )}

          {!isLoading && !error && activeTab === "created" && hasCreated && (
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
                    <p className="mt-2 whitespace-pre-wrap break-words text-neutral-900">
                      {r.text}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                      <span className="font-mono break-words">
                        Creator: {r.creator.slice(0, 8)}…{r.creator.slice(-4)}
                      </span>
                      <a
                        href={`https://explorer.stacks.co/address/${r.creator}?chain=mainnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline">
                        View creator
                      </a>
                      <span className="font-mono break-words">
                        Owner: {r.owner.slice(0, 8)}…{r.owner.slice(-4)}
                      </span>
                      <a
                        href={`https://explorer.stacks.co/address/${r.owner}?chain=mainnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline">
                        View owner
                      </a>
                      <span className="font-mono break-words">
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
                      {address &&
                        (r.creator === address ||
                          r.owner === address ||
                          r.royaltyRecipient === address) && (
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
                      <p className="mt-2 whitespace-pre-wrap break-words text-neutral-900">
                        {r.text}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                        <span className="font-mono break-words">
                          Creator: {r.creator.slice(0, 8)}…{r.creator.slice(-4)}
                        </span>
                        <a
                          href={`https://explorer.stacks.co/address/${r.creator}?chain=mainnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline">
                          View creator
                        </a>
                        <span className="font-mono break-words">
                          Owner: {r.owner.slice(0, 8)}…{r.owner.slice(-4)}
                        </span>
                        <a
                          href={`https://explorer.stacks.co/address/${r.owner}?chain=mainnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline">
                          View owner
                        </a>
                      <span className="font-mono break-words">
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
                      {address &&
                        (r.creator === address ||
                          r.owner === address ||
                          r.royaltyRecipient === address) && (
                          <span className="rounded-full border border-black px-2 py-1">
                            You are involved
                          </span>
                        )}
                      {address === r.creator && (
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

          {!isLoading &&
            !activityError &&
            activeTab === "activity" &&
            hasActivity && (
              <ul className="space-y-3">
                <li className="text-[11px]">
                  <span className="rounded-full border border-dashed border-neutral-500 bg-neutral-50 px-2 py-1">
                    Contract · {totalOnChain ?? 0} stamped so far
                  </span>
                </li>
                {activityReceipts.map((r) => {
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
                      <p className="mt-2 whitespace-pre-wrap break-words text-neutral-900">
                        {r.text}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
                        <span className="font-mono break-words">
                          Creator: {r.creator.slice(0, 8)}…{r.creator.slice(-4)}
                        </span>
                        <a
                          href={`https://explorer.stacks.co/address/${r.creator}?chain=mainnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline">
                          View creator
                        </a>
                        <span className="font-mono break-words">
                          Owner: {r.owner.slice(0, 8)}…{r.owner.slice(-4)}
                        </span>
                        <a
                          href={`https://explorer.stacks.co/address/${r.owner}?chain=mainnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline">
                          View owner
                        </a>
                        <span className="font-mono break-words">
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
                        {address &&
                          (r.creator === address ||
                            r.owner === address ||
                            r.royaltyRecipient === address) && (
                            <span className="rounded-full border border-black px-2 py-1">
                              You are involved
                            </span>
                          )}
                      </div>
                    </li>
                  );
                })}
                {activityNextHighest !== null && (
                  <li>
                    <button
                      type="button"
                      onClick={handleLoadMoreActivity}
                      disabled={activityLoadingMore}
                      className="rounded-full border border-black px-3 py-1 text-[11px] uppercase tracking-[0.18em] hover:bg-black hover:text-white disabled:opacity-50">
                      {activityLoadingMore ? "Loading…" : "Load more"}
                    </button>
                  </li>
                )}
              </ul>
            )}
        </div>
      )}
    </section>
  );
}
