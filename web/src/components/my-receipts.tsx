"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import {
  getReceiptsByOwner,
  getLastId,
  type Receipt,
} from "@/lib/receipt-contract";

export function MyReceipts() {
  const { address } = useWallet();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalOnChain, setTotalOnChain] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasReceipts = receipts.length > 0;
  const hasTotal = typeof totalOnChain === "number" && totalOnChain > 0;

  const loadReceipts = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const [total, list] = await Promise.all([
        getLastId(),
        getReceiptsByOwner(address),
      ]);

      setTotalOnChain(total);
      setReceipts(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load receipts from Stacks testnet.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    loadReceipts();
  }, [address, loadReceipts]);

  const handleRefresh = async () => {
    if (!address) return;
    setIsRefreshing(true);
    await loadReceipts();
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
          connected Stacks wallet on testnet. Each receipt is a small proof that
          you were paying attention to your own life.
        </p>

        {address && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600">
            {hasReceipts && (
              <span className="rounded-full border border-black bg-neutral-50 px-2 py-1">
                You · {receipts.length} receipt
                {receipts.length > 1 ? "s" : ""}
              </span>
            )}
            {hasTotal && (
              <span className="rounded-full border border-dashed border-neutral-500 bg-neutral-50 px-2 py-1">
                Contract · {totalOnChain} stamped so far
              </span>
            )}
            {!hasTotal && !isLoading && (
              <span className="rounded-full border border-dashed border-neutral-500 bg-neutral-50 px-2 py-1">
                Contract is still empty on testnet.
              </span>
            )}
          </div>
        )}
      </header>

      {!address && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar to see your receipts.
        </div>
      )}

      {address && (
        <div className="space-y-4">
          {isLoading && (
            <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
              Loading receipts from Stacks testnet…
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {!isLoading && !error && !hasReceipts && hasTotal && (
            <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
              There are{" "}
              <span className="font-mono">
                {totalOnChain} receipt{totalOnChain === 1 ? "" : "s"}
              </span>{" "}
              on this contract, but none were stamped by this wallet yet. Stamp
              your first receipt on the home page.
            </div>
          )}

          {!isLoading && !error && !hasReceipts && !hasTotal && (
            <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs">
              No receipts exist on this contract yet. Be the first one to stamp
              a Receipt of Life on the home page.
            </div>
          )}

          {!isLoading && !error && hasReceipts && (
            <ul className="space-y-3">
              {receipts.map((r) => {
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
                    <p className="mt-2 whitespace-pre-wrap text-neutral-900">
                      {r.text}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-600">
                      <span className="font-mono">
                        Owner: {r.owner.slice(0, 10)}…
                      </span>
                      <a
                        href={`https://explorer.stacks.co/address/${r.owner}?chain=testnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline">
                        View address
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
