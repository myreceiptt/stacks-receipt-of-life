"use client";

import { formatDateTime, shortenAddress } from "@/lib/formatters";
import { buttonStyles } from "@/lib/button-styles";

type FeedItem = {
  txid: string;
  label: string;
  sender: string;
  recipient?: string;
  timestamp?: string;
  receiptId?: number | null;
};

type FeedTabProps = {
  feedItems: FeedItem[];
  feedLoading: boolean;
  feedError: string | null;
  feedPage: number;
  totalFeedPages: number;
  onPageChange: (page: number) => void;
  onReceiptSelect: (id: number) => void;
  feedCooling: boolean;
  cooldownMs: number;
  title?: string;
  emptyMessage?: string;
};

export function FeedTab({
  feedItems,
  feedLoading,
  feedError,
  feedPage,
  totalFeedPages,
  onPageChange,
  onReceiptSelect,
  feedCooling,
  cooldownMs,
  title = "Your Activity Feed",
  emptyMessage = "No matching transactions found for this address.",
}: FeedTabProps) {
  if (feedCooling) {
    return (
      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          {title}
        </p>
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Cooling down for {Math.max(0, Math.ceil(cooldownMs))} milliseconds and
          then loading on-chain data for feed...
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
        {title}
      </p>

      {feedLoading && (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Loading on-chain data for feed...
        </div>
      )}

      {feedError && (
        <div className="rounded-md border border-dashed border-red-400 bg-red-50 p-3 text-sm text-red-700">
          {feedError}
        </div>
      )}

      {!feedLoading && !feedError && feedItems.length === 0 && (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          {emptyMessage}
        </div>
      )}

      {!feedLoading && !feedError && feedItems.length > 0 && (
        <ul className="list-disc space-y-3 pl-4 text-sm text-neutral-800">
          {feedItems.map((item) => (
            <li key={item.txid} className="pl-1">
              <div className="font-semibold">
                {item.receiptId != null ? (
                  (() => {
                    const token = `RECEIPT #${item.receiptId}`;
                    if (!item.label.includes(token)) return item.label;
                        const [before, ...rest] = item.label.split(token);
                        const after = rest.join(token);
                    return (
                      <>
                        {before}
                        <button
                          type="button"
                          onClick={() => onReceiptSelect(item.receiptId!)}
                          className="uppercase underline">
                          {token}
                        </button>
                        {after}
                      </>
                    );
                  })()
                ) : (
                  item.label
                )}
              </div>
              {item.timestamp && (
                <div className="mt-1 text-[11px] text-neutral-500">
                  {formatDateTime(item.timestamp)}
                </div>
              )}
              <div className="mt-1 text-[11px] text-neutral-600">
                tx. id:{" "}
                <a
                  href={`https://explorer.stacks.co/txid/${item.txid}?chain=mainnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline">
                  <span className="font-mono">
                    {item.txid.slice(0, 7)} ... {item.txid.slice(-7)}
                  </span>
                </a>{" "}
                <span className="font-mono">(View on Explorer)</span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-600">
                sender:{" "}
                <a
                  href={`https://explorer.stacks.co/address/${item.sender}?chain=mainnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline">
                  <span className="font-mono">{shortenAddress(item.sender)}</span>
                </a>{" "}
                <span className="font-mono">(View on Explorer)</span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-600">
                recipient:{" "}
                {item.recipient ? (
                  <>
                    <a
                      href={`https://explorer.stacks.co/address/${item.recipient}?chain=mainnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline">
                      <span className="font-mono">
                        {shortenAddress(item.recipient)}
                      </span>
                    </a>{" "}
                    <span className="font-mono">(View on Explorer)</span>
                  </>
                ) : (
                  <span className="font-mono">no recipient</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!feedLoading && !feedError && totalFeedPages > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => onPageChange(feedPage - 1)}
            disabled={feedPage === 1}
            className={buttonStyles.action}>
            Prev
          </button>
          {Array.from({ length: totalFeedPages }, (_, idx) => idx + 1)
            .filter((page) => {
              if (totalFeedPages <= 7) return true;
              if (page === 1 || page === totalFeedPages) return true;
              return Math.abs(page - feedPage) <= 1;
            })
            .map((page, index, visible) => {
              const prev = visible[index - 1];
              const needsGap = prev && page - prev > 1;
              return (
                <span key={page} className="flex items-center gap-2">
                  {needsGap && <span className="text-xs">…</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                      page === feedPage
                        ? "border-black bg-black text-white hover:bg-white hover:text-black"
                        : "border-black bg-white hover:bg-black hover:text-white"
                    }`}>
                    {page}
                  </button>
                </span>
              );
            })}
          <button
            type="button"
            onClick={() => onPageChange(feedPage + 1)}
            disabled={totalFeedPages > 0 && feedPage >= totalFeedPages}
            className={buttonStyles.action}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
