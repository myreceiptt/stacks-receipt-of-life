"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useAppKitAccount } from "@reown/appkit/react";
import { cvToJSON, hexToCV } from "@stacks/transactions";
import { FeedTab } from "@/components/tab/feed";
import { StampTab } from "@/components/tab/stamp";
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  getConfig,
  getStats,
  submitReceipt,
  submitReceiptFor,
} from "@/lib/receipt-contract";

export default function HomePage() {
  const { address } = useWallet();
  const { address: wcAddress } = useAppKitAccount({ namespace: "stacks" });
  const activeAddress = address ?? wcAddress ?? null;
  const [text, setText] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "stamp">("stamp");
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [config, setConfigState] = useState<{
    contractOwner: string;
    treasury: string;
    admin: string;
    stampFee: number;
    royaltyFee: number;
    lastId: number;
    version: { major: number; minor: number; patch: number } | null;
  } | null>(null);
  const [stats, setStatsState] = useState<{
    lastId: number;
    totalSubmissions: number;
    totalTransfers: number;
    totalStampFee: number;
    totalRoyaltyFee: number;
    version: { major: number; minor: number; patch: number } | null;
  } | null>(null);
  const [feedItems, setFeedItems] = useState<
    Array<{
      txid: string;
      label: string;
      sender: string;
      recipient?: string;
      timestamp?: string;
    }>
  >([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);

  const shortenAddress = (value?: string) =>
    value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "unknown";

  const maxChars = 160;
  const remaining = maxChars - text.length;
  const isOverLimit = remaining < 0;
  const feedPageSize = 47;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setRecipientError(null);
    setTxId(null);

    if (!activeAddress) {
      setError("Connect your Stacks wallet first.");
      return;
    }

    if (!text.trim()) {
      setError("Your receipt cannot be empty.");
      return;
    }

    if (isOverLimit) {
      setError("Your receipt is too long.");
      return;
    }

    if (isGift) {
      const trimmedRecipient = recipientAddress.trim();
      const looksValid =
        trimmedRecipient.length >= 10 && trimmedRecipient.startsWith("S");
      if (!trimmedRecipient || !looksValid) {
        setRecipientError(
          "Enter a valid Stacks address to send this receipt as a gift."
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = isGift
        ? await submitReceiptFor(text.trim(), recipientAddress.trim())
        : await submitReceipt(text.trim());
      if (response.txid) {
        setTxId(response.txid);
        setText("");
        if (isGift) {
          setRecipientAddress("");
        }
      } else {
        setError("Transaction sent, but response format was unexpected.");
      }
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit receipt. Please check the console for details.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const explorerUrl =
    txId && `https://explorer.stacks.co/txid/${txId}?chain=mainnet`;

  const decodeArg = (arg: unknown) => {
    const hex =
      typeof arg === "string"
        ? arg
        : typeof arg === "object" &&
          arg !== null &&
          "hex" in (arg as Record<string, unknown>) &&
          typeof (arg as { hex?: string }).hex === "string"
        ? (arg as { hex: string }).hex
        : null;
    if (!hex) return null;
    const normalized = hex.startsWith("0x") ? hex : `0x${hex}`;
    try {
      const cv = hexToCV(normalized);
      const json = cvToJSON(cv);
      if (
        json &&
        typeof json === "object" &&
        "type" in json &&
        "value" in json
      ) {
        return json as { type: string; value: unknown };
      }
    } catch (err) {
      console.error("Failed to decode arg", err);
    }
    return null;
  };

  const extractUint = (arg: { type: string; value: unknown } | null) => {
    if (!arg || arg.type !== "uint") return undefined;
    const raw = arg.value;
    const parsed = typeof raw === "string" ? Number(raw) : Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
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

  const fetchFeed = useCallback(
    async (activeAddress: string, page = 1) => {
      const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
      const offset = (page - 1) * feedPageSize;
      const endpoint = `https://api.mainnet.hiro.so/extended/v1/tx?contract_id=${contractId}&limit=${feedPageSize}&offset=${offset}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Failed to load contract transactions.");
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

      const items =
        data.results?.flatMap((tx) => {
          if (tx.tx_status !== "success") return [];
          const functionName = tx.contract_call?.function_name;
          if (!functionName) return [];

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
          const matchesAddress =
            sender === activeAddress || principalArgs.includes(activeAddress);
          if (!matchesAddress) return [];

          const receiptId = extractReceiptId(tx.tx_result?.hex);
          const recipient =
            principalArgs.length > 0 ? principalArgs.at(-1) : undefined;
          const idArg = extractUint(decodedArgs[0] ?? null);
          const feeStampArg = extractUint(decodedArgs[0] ?? null);
          const feeRoyaltyArg = extractUint(decodedArgs[1] ?? null);

          let label = "";
          let recipientAddress = recipient;
          if (functionName === "submit-receipt") {
            recipientAddress = sender;
            label = `Stamp Receipt ID ${receiptId ?? "?"} for Self`;
          } else if (functionName === "submit-receipt-for") {
            if (recipient === activeAddress && sender !== activeAddress) {
              label = `Receive Receipt ID ${
                receiptId ?? "?"
              } from ${shortenAddress(sender)}`;
            } else {
              label = `Stamp Receipt ID ${
                receiptId ?? "?"
              } as Gift to ${shortenAddress(recipient)}`;
            }
          } else if (functionName === "transfer-receipt") {
            const transferId = idArg ?? receiptId ?? "?";
            if (recipient === activeAddress && sender !== activeAddress) {
              label = `Receive Receipt ID ${
                transferId
              } from ${shortenAddress(sender)}`;
            } else {
              label = `Transfer Receipt ID ${
                transferId
              } to ${shortenAddress(recipient)}`;
            }
          } else if (functionName === "set-receipt-royalty-recipient") {
            const targetId = idArg ?? receiptId ?? "?";
            label = `Royalty recipient updated for Receipt ID ${targetId} to ${shortenAddress(
              recipient
            )}`;
          } else if (functionName === "set-fees") {
            label = `Admin updated fees: STAMP-FEE ${
              feeStampArg ?? "?"
            } µSTX, ROYALTY-FEE ${feeRoyaltyArg ?? "?"} µSTX`;
          } else if (functionName === "set-admin") {
            label = `Admin changed to ${shortenAddress(recipient)}`;
          } else {
            return [];
          }

          return [
            {
              txid: tx.tx_id,
              label,
              sender,
              recipient: recipientAddress,
              timestamp: tx.block_time_iso ?? tx.burn_block_time_iso,
            },
          ];
        }) ?? [];

      const total = typeof data.total === "number" ? data.total : 0;
      return { items, total };
    },
    [feedPageSize]
  );

  const handleRefresh = useCallback(async () => {
    if (!activeAddress) return;
    setLoadingData(true);
    setIsRefreshing(true);
    setDataError(null);
    setError(null);
    setRecipientError(null);
    setTxId(null);
    setFeedLoading(true);
    setFeedError(null);
    try {
      const [cfg, st] = await Promise.all([getConfig(), getStats()]);
      if (cfg) setConfigState(cfg);
      if (st) setStatsState(st);
      if (!cfg || !st) {
        setDataError("Unable to fetch on-chain data. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setDataError(
        "Unable to fetch on-chain data. Verify contract address and network."
      );
    }

    try {
      const { items, total } = await fetchFeed(activeAddress, 1);
      setFeedItems(items);
      setFeedTotal(total);
      setFeedPage(1);
    } catch (err) {
      console.error(err);
      setFeedError(
        "Unable to load on-chain data for the feed. Please try again."
      );
    }

    setLoadingData(false);
    setFeedLoading(false);
    setIsRefreshing(false);
  }, [activeAddress, fetchFeed]);

  const totalFeedPages =
    feedTotal > 0 ? Math.ceil(feedTotal / feedPageSize) : 0;

  const handleFeedPageChange = async (nextPage: number) => {
    if (!activeAddress || feedLoading) return;
    if (nextPage < 1 || (totalFeedPages > 0 && nextPage > totalFeedPages)) {
      return;
    }
    setFeedLoading(true);
    setFeedError(null);
    try {
      const { items, total } = await fetchFeed(activeAddress, nextPage);
      setFeedItems(items);
      setFeedTotal(total);
      setFeedPage(nextPage);
    } catch (err) {
      console.error(err);
      setFeedError("Unable to load feed items.");
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (!activeAddress) return;
    handleRefresh();
  }, [activeAddress, handleRefresh]);

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
              Receipt of Life · v4.7.47
            </p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
              Stamp Your Receipt on Stacks.
            </h1>
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
              disabled={!activeAddress || loadingData}
              className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40">
              {isRefreshing || loadingData ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Stamp a <span className="font-bold">Receipt of Life</span> using{" "}
          <span className="font-bold">$MyReceipt</span> contract secured by{" "}
          <span className="font-bold">Bitcoin</span> via{" "}
          <span className="font-bold">Stacks mainnet</span>.
        </p>
      </header>

      {!activeAddress && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar above to stamp your receipt.
        </div>
      )}

      {activeAddress && (
        <div className="space-y-4">
          <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
            Write a statement that feels like a receipt for how you live
            today—either for yourself or as a gift to someone out there. When
            stamped, a transaction is submitted to the contract on Stacks
            mainnet.
          </p>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("stamp")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "stamp"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Stamp
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("feed")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "feed"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Feed
            </button>
          </div>

          {activeTab === "stamp" && (
            <StampTab
              loadingData={loadingData}
              dataError={dataError}
              config={config}
              stats={stats}
              isOverLimit={isOverLimit}
              remaining={remaining}
              isGift={isGift}
              text={text}
              recipientAddress={recipientAddress}
              isSubmitting={isSubmitting}
              error={error}
              recipientError={recipientError}
              txId={txId}
              explorerUrl={explorerUrl}
              maxChars={maxChars}
              onSubmit={handleSubmit}
              onTextChange={setText}
              onGiftChange={setIsGift}
              onRecipientChange={setRecipientAddress}
            />
          )}

          {activeTab === "feed" && (
            <FeedTab
              feedItems={feedItems}
              feedLoading={feedLoading}
              feedError={feedError}
              feedPage={feedPage}
              totalFeedPages={totalFeedPages}
              onPageChange={handleFeedPageChange}
            />
          )}
        </div>
      )}
    </section>
  );
}
