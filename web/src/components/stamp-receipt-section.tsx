"use client";

import { FormEvent, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { submitReceipt } from "@/lib/receipt-contract";

export function StampReceiptSection() {
  const { address } = useWallet();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const maxChars = 160;
  const remaining = maxChars - text.length;
  const isOverLimit = remaining < 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
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

    setIsSubmitting(true);
    try {
      const response = await submitReceipt(text.trim());
      if (response.txId) {
        setTxId(response.txId);
        setText("");
      } else {
        setError("Transaction sent, but response format was unexpected.");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ??
          "Failed to submit receipt. Please check the console for details."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const explorerUrl =
    txId && `https://explorer.stacks.co/txid/${txId}?chain=testnet`;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
          Stamp a receipt
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Write one sentence that feels like a Receipt of Life for today. When
          you stamp it, we&apos;ll submit a transaction to the{" "}
          <span className="font-medium">receipt-of-life</span> contract on
          Stacks testnet.
        </p>
      </div>

      {!address && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar above to mint your first
          NOTA.
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
          <div className="flex items-center justify-between text-[11px] text-neutral-600">
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
          {isSubmitting ? "Stamping…" : "Stamp receipt"}
        </button>
      </form>
    </section>
  );
}
