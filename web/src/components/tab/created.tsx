"use client";

import type { Receipt } from "@/lib/receipt-contract";
import { formatDateTime } from "@/lib/formatters";
import { buttonStyles } from "@/lib/button-styles";
import { ExplorerLink } from "@/components/explorer-link";

type CreatedTabProps = {
  createdReceipts: Receipt[];
  activeLoading: boolean;
  createdError: string | null;
  isLoading: boolean;
  hasCreated: boolean;
  hasTotal: boolean;
  totalOnChain: number | null;
  createdHasMore: boolean;
  createdLoadingMore: boolean;
  onSelectReceipt: (receipt: Receipt) => void;
  onLoadMore: () => void;
};

export function CreatedTab({
  createdReceipts,
  activeLoading,
  createdError,
  isLoading,
  hasCreated,
  hasTotal,
  totalOnChain,
  createdHasMore,
  createdLoadingMore,
  onSelectReceipt,
  onLoadMore,
}: CreatedTabProps) {
  return (
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
              const dateLabel = formatDateTime(r.createdAt * 1000);
              return (
                <li key={r.id} className="pl-1">
                  <div className="font-semibold">
                    You Created:{" "}
                    <span
                      onClick={() => onSelectReceipt(r)}
                      className="cursor-pointer uppercase underline">
                      RECEIPT #{r.id}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    {dateLabel}
                  </div>
                  <ExplorerLink
                    label="Owner"
                    href={`https://explorer.stacks.co/address/${r.owner}?chain=mainnet`}
                    text={r.owner}
                  />
                  <ExplorerLink
                    label="Royalty to"
                    href={`https://explorer.stacks.co/address/${r.royaltyRecipient}?chain=mainnet`}
                    text={r.royaltyRecipient}
                  />
                </li>
              );
            })}
          </ul>
          {createdHasMore ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={createdLoadingMore}
                className={buttonStyles.action}>
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
  );
}
