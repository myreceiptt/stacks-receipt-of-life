"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useCooldown } from "@/hooks/use-cooldown";
import { useAppKitAccount } from "@reown/appkit/react";
import { cvToJSON, hexToCV } from "@stacks/transactions";
import { FeedTab } from "@/components/tab/feed";
import { ReceiptModal } from "@/components/receipt-modal";
import { PageHeaderActions } from "@/components/page-header-actions";
import { toggleButtonClass } from "@/lib/button-styles";
import { shortenAddress } from "@/lib/formatters";
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  getReceipt,
  type Receipt,
} from "@/lib/receipt-contract";

export default function LivePage() {
  const { address } = useWallet();
  const { address: wcAddress } = useAppKitAccount({ namespace: "stacks" });
  const activeAddress = address ?? wcAddress ?? null;
  const { isCooling, remainingMs, markSuccess, startCooldownIfNeeded } =
    useCooldown();
  const pendingActionRef = useRef<null | (() => Promise<void>)>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedItems, setFeedItems] = useState<
    Array<{
      txid: string;
      label: string;
      sender: string;
      recipient?: string;
      timestamp?: string;
      receiptId?: number | null;
    }>
  >([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const feedPageSize = 11;
  const feedApiPageSize = 50;

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

  const decodeArg = (arg: unknown) => {
    try {
      if (typeof arg !== "object" || arg === null) return null;
      const value = arg as { hex?: string };
      if (!value.hex) return null;
      return cvToJSON(hexToCV(value.hex));
    } catch (err) {
      console.error("Failed to decode tx argument", err);
      return null;
    }
  };

  const extractReceiptId = (hex?: string) => {
    if (!hex) return undefined;
    const normalized = hex.startsWith("0x") ? hex : `0x${hex}`;
    try {
      const json = cvToJSON(hexToCV(normalized));
      if (json && typeof json === "object" && "type" in json) {
        const typed = json as { type: string; value?: unknown };
        if (typed.type.includes("response") && typed.value) {
          const inner = typed.value as { type?: string; value?: unknown };
          if (inner?.type === "uint" && typeof inner.value === "string") {
            const parsed = Number(inner.value);
            return Number.isNaN(parsed) ? undefined : parsed;
          }
        }
        if (typed.type === "uint" && typeof typed.value === "string") {
          const parsed = Number(typed.value);
          return Number.isNaN(parsed) ? undefined : parsed;
        }
      }
    } catch (err) {
      console.error("Failed to decode tx result", err);
    }
    return undefined;
  };

  const extractUint = (decoded: unknown) => {
    if (!decoded || typeof decoded !== "object") return undefined;
    const typed = decoded as { type?: string; value?: unknown };
    if (typed.type !== "uint") return undefined;
    const raw = typed.value;
    const parsed = typeof raw === "string" ? Number(raw) : Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const fetchFeed = useCallback(async (page = 1) => {
    const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
    let offset = 0;
    let total = 0;
    const matches: Array<{
      txid: string;
      label: string;
      sender: string;
      recipient?: string;
      timestamp?: string;
      receiptId?: number | null;
    }> = [];

    while (true) {
      const endpoint = `https://api.mainnet.hiro.so/extended/v1/tx?contract_id=${contractId}&limit=${feedApiPageSize}&offset=${offset}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(
          "Failed to load contract transactions. Please try again later."
        );
      }
      const data = (await response.json()) as {
        total?: number;
        results?: Array<{
          tx_id: string;
          sender_address: string;
          tx_status: string;
          block_time_iso?: string;
          burn_block_time_iso?: string;
          contract_call?: {
            function_name: string;
            function_args: unknown[];
          };
          tx_result?: { hex?: string };
        }>;
      };

      if (typeof data.total === "number") {
        total = data.total;
      }

      const results = data.results ?? [];
      if (results.length === 0) {
        break;
      }

      for (const tx of results) {
        if (tx.tx_status !== "success") continue;
        const functionName = tx.contract_call?.function_name;
        if (!functionName) continue;

        const decodedArgs = (tx.contract_call?.function_args ?? []).map(
          decodeArg
        );
        const principalArgs = decodedArgs
          .filter(
            (arg): arg is { type: string; value: unknown } =>
              !!arg && arg.type === "principal"
          )
          .map((arg) => String(arg.value));

        const sender = tx.sender_address;
        const receiptId = extractReceiptId(tx.tx_result?.hex);
        const recipient =
          principalArgs.length > 0 ? principalArgs.at(-1) : undefined;
        const idArg = extractUint(decodedArgs[0] ?? null);
        const feeStampArg = extractUint(decodedArgs[0] ?? null);
        const feeRoyaltyArg = extractUint(decodedArgs[1] ?? null);

        let label = "";
        let recipientAddress = recipient;
        let receiptIdValue: number | null = null;
        if (functionName === "submit-receipt") {
          recipientAddress = sender;
          receiptIdValue = receiptId ?? null;
          label = `Stamp RECEIPT #${receiptId ?? "?"} for Self`;
        } else if (functionName === "submit-receipt-for") {
          receiptIdValue = receiptId ?? null;
          label = `Stamp RECEIPT #${
            receiptId ?? "?"
          } as Gift to ${shortenAddress(recipient)}`;
        } else if (functionName === "transfer-receipt") {
          const transferId = idArg ?? receiptId ?? "?";
          receiptIdValue =
            typeof transferId === "number" ? transferId : receiptId ?? null;
          label = `Transfer RECEIPT #${transferId} to ${shortenAddress(
            recipient
          )}`;
        } else if (functionName === "set-receipt-royalty-recipient") {
          const targetId = idArg ?? receiptId ?? "?";
          receiptIdValue =
            typeof targetId === "number" ? targetId : receiptId ?? null;
          label = `Royalty recipient updated for RECEIPT #${targetId} to ${shortenAddress(
            recipient
          )}`;
        } else if (functionName === "set-fees") {
          label = `Admin updated fees: STAMP-FEE ${
            feeStampArg ?? "?"
          } µSTX, ROYALTY-FEE ${feeRoyaltyArg ?? "?"} µSTX`;
        } else if (functionName === "set-admin") {
          label = `Admin changed to ${shortenAddress(recipient)}`;
        } else {
          continue;
        }

        matches.push({
          txid: tx.tx_id,
          label,
          sender,
          recipient: recipientAddress,
          timestamp: tx.block_time_iso ?? tx.burn_block_time_iso,
          receiptId: receiptIdValue,
        });
      }

      offset += feedApiPageSize;
      if (total && offset >= total) {
        break;
      }
    }

    const startIndex = (page - 1) * feedPageSize;
    const items = matches.slice(startIndex, startIndex + feedPageSize);
    return { items, total: matches.length };
  }, []);

  const handleRefresh = useCallback(() => {
    runWithCooldown(async () => {
      setFeedLoading(true);
      setFeedError(null);
      setIsRefreshing(true);
      try {
        const { items, total } = await fetchFeed(1);
        setFeedItems(items);
        setFeedTotal(total);
        setFeedPage(1);
        markSuccess();
      } catch (err) {
        console.error(err);
        setFeedError("Unable to load the live feed. Please try again.");
      } finally {
        setFeedLoading(false);
        setIsRefreshing(false);
      }
    });
  }, [fetchFeed, markSuccess, runWithCooldown]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const totalFeedPages = Math.max(1, Math.ceil(feedTotal / feedPageSize));

  const handleFeedPageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalFeedPages) return;
      runWithCooldown(async () => {
        setFeedLoading(true);
        setFeedError(null);
        try {
          const { items } = await fetchFeed(page);
          setFeedItems(items);
          setFeedPage(page);
          markSuccess();
        } catch (err) {
          console.error(err);
          setFeedError("Unable to load the live feed. Please try again.");
        } finally {
          setFeedLoading(false);
        }
      });
    },
    [fetchFeed, markSuccess, runWithCooldown, totalFeedPages]
  );

  const handleReceiptSelect = useCallback(
    async (id: number) => {
      try {
        const receipt = await getReceipt(id, activeAddress ?? undefined);
        if (receipt) {
          setSelectedReceipt(receipt);
        }
      } catch (err) {
        console.error("Failed to load receipt", err);
      }
    },
    [activeAddress]
  );

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
              Live Page · receipts activity
            </p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
              Receipts Live Feed.
            </h1>
          </div>

          <PageHeaderActions
            address={activeAddress}
            onRefresh={handleRefresh}
            disabled={isCooling || isRefreshing || feedLoading}
            isRefreshing={isRefreshing || feedLoading}
          />
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Live feed for <span className="font-bold">$MyReceipt</span>. Anyone
          can review on-chain activity here, connected or not.
        </p>
      </header>

      <div className="space-y-4">
        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Each entry mirrors the Stacks explorer. It reflects all the $MyReceipt
          contract transactions, formatted like the feed you would see in the
          Stacks explorer, and added a link to the receipt itself.
        </p>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <button
            type="button"
            className={toggleButtonClass(
              true,
              "rounded-full border px-3 py-1 uppercase tracking-[0.18em]"
            )}>
            Live
          </button>
        </div>

        <FeedTab
          feedItems={feedItems}
          feedLoading={feedLoading}
          feedError={feedError}
          feedPage={feedPage}
          totalFeedPages={totalFeedPages}
          onPageChange={handleFeedPageChange}
          onReceiptSelect={handleReceiptSelect}
          feedCooling={isCooling}
          cooldownMs={remainingMs}
          title="Live Contract Feed"
          emptyMessage="No contract transactions found yet."
        />
        <ReceiptModal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          receipt={selectedReceipt}
          locked={!activeAddress}
        />
      </div>
    </section>
  );
}
