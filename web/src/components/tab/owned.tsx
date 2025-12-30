"use client";

import type { Receipt } from "@/lib/receipt-contract";
import { formatDateTime } from "@/lib/formatters";
import { buttonStyles } from "@/lib/button-styles";
import { ExplorerLink } from "@/components/explorer-link";

type OwnedTabProps = {
  ownedReceipts: Receipt[];
  activeLoading: boolean;
  error: string | null;
  isLoading: boolean;
  hasOwned: boolean;
  hasTotal: boolean;
  totalOnChain: number | null;
  activeAddress: string | null;
  transferInputs: Record<number, string>;
  transferErrors: Record<number, string>;
  transferSuccess: Record<number, string>;
  transferring: Record<number, boolean>;
  ownedHasMore: boolean;
  ownedLoadingMore: boolean;
  onSelectReceipt: (receipt: Receipt) => void;
  onTransferInputChange: (id: number, value: string) => void;
  onTransfer: (receipt: Receipt) => void;
  onLoadMore: () => void;
};

export function OwnedTab({
  ownedReceipts,
  activeLoading,
  error,
  isLoading,
  hasOwned,
  hasTotal,
  totalOnChain,
  activeAddress,
  transferInputs,
  transferErrors,
  transferSuccess,
  transferring,
  ownedHasMore,
  ownedLoadingMore,
  onSelectReceipt,
  onTransferInputChange,
  onTransfer,
  onLoadMore,
}: OwnedTabProps) {
  return (
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
        <>
          <ul className="list-disc space-y-3 pl-4 text-sm text-neutral-800">
            {ownedReceipts.map((r) => {
                  const dateLabel = formatDateTime(r.createdAt * 1000);
                  return (
                    <li key={r.id} className="pl-1">
                  <div className="font-semibold">
                    You Owned:{" "}
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
                    label="Creator"
                    href={`https://explorer.stacks.co/address/${r.creator}?chain=mainnet`}
                    text={r.creator}
                  />
                  <ExplorerLink
                    label="Royalty to"
                    href={`https://explorer.stacks.co/address/${r.royaltyRecipient}?chain=mainnet`}
                    text={r.royaltyRecipient}
                  />
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
                            onTransferInputChange(r.id, e.target.value)
                          }
                          placeholder="S..."
                          className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
                        <span>
                          This will be stored on-chain and linked to your STX
                          address.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTransfer(r)}
                        disabled={!!transferring[r.id]}
                        className={`mt-3 ${buttonStyles.primary}`}>
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
                onClick={onLoadMore}
                disabled={ownedLoadingMore}
                className={buttonStyles.action}>
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
  );
}
