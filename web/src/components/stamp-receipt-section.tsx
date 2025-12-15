"use client";

import { FormEvent, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { submitReceipt, submitReceiptFor } from "@/lib/receipt-contract";

export function StampReceiptSection() {
  const { address } = useWallet();
  const [text, setText] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const maxChars = 160;
  const remaining = maxChars - text.length;
  const isOverLimit = remaining < 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setRecipientError(null);
    setTxId(null);

    if (!address) {
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

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
          Stamp a receipt
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Write a Receipt of Life for today. When you stamp it, it will submit a
          transaction to the <span className="font-medium">$MyReceipt</span>{" "}
          contract secured by Bitcoin via Stacks mainnet—either for yourself or
          as a gift to someone out there.
        </p>
      </div>

      {!address && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar above to mint your first
          receipt.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-black bg-white p-4 sm:p-6">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.18em]">
            Your receipt
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={maxChars + 40} // hard cap safeguard
            className="w-full resize-none border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="I am living like someone who..."
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
            <span>
              {address
                ? "This will be stored on-chain and linked to your STX address."
                : "Connect wallet to see your receipt on-chain."}
            </span>
            <span className={isOverLimit ? "text-red-600" : ""}>
              {remaining} chars left
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-700">
          <button
            type="button"
            onClick={() => setIsGift(false)}
            className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
              !isGift
                ? "border-black bg-black text-white"
                : "border-black bg-white"
            }`}>
            For me
          </button>
          <button
            type="button"
            onClick={() => setIsGift(true)}
            className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
              isGift
                ? "border-black bg-black text-white"
                : "border-black bg-white"
            }`}>
            As a gift
          </button>
        </div>

        {isGift && (
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-[0.18em]">
              Recipient Stacks address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="SB... or SP..."
              className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            />
            {recipientError && (
              <p className="text-[11px] text-red-700">{recipientError}</p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {txId && explorerUrl && (
          <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-800">
            <div className="font-semibold">Receipt stamped.</div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="underline">
              View transaction on Stacks Explorer
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !address || isOverLimit}
          className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
          {isSubmitting
            ? "Stamping…"
            : isGift
            ? "Stamp as gift"
            : "Stamp for me"}
        </button>
      </form>
    </section>
  );
}
