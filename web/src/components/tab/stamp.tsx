"use client";

type ContractVersion = {
  major: number;
  minor: number;
  patch: number;
};

type ContractConfig = {
  contractOwner: string;
  treasury: string;
  admin: string;
  stampFee: number;
  royaltyFee: number;
  lastId: number;
  version: ContractVersion | null;
};

type ContractStats = {
  lastId: number;
  totalSubmissions: number;
  totalTransfers: number;
  totalStampFee: number;
  totalRoyaltyFee: number;
  version: ContractVersion | null;
};

type StampTabProps = {
  loadingData: boolean;
  dataError: string | null;
  config: ContractConfig | null;
  stats: ContractStats | null;
  cooling: boolean;
  cooldownMs: number;
  isOverLimit: boolean;
  remaining: number;
  isGift: boolean;
  text: string;
  recipientAddress: string;
  isSubmitting: boolean;
  error: string | null;
  recipientError: string | null;
  txId: string | null;
  explorerUrl: string | null;
  maxChars: number;
  onSubmit: (event: React.FormEvent) => void;
  onTextChange: (value: string) => void;
  onGiftChange: (value: boolean) => void;
  onRecipientChange: (value: string) => void;
};

export function StampTab({
  loadingData,
  dataError,
  config,
  stats,
  cooling,
  cooldownMs,
  isOverLimit,
  remaining,
  isGift,
  text,
  recipientAddress,
  isSubmitting,
  error,
  recipientError,
  txId,
  explorerUrl,
  maxChars,
  onSubmit,
  onTextChange,
  onGiftChange,
  onRecipientChange,
}: StampTabProps) {
  if (cooling) {
    return (
      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Stamp a Receipt
        </p>
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Cooling down for {Math.max(0, Math.ceil(cooldownMs))} milliseconds and
          then loading on-chain data...
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
        Stamp a Receipt
      </p>

      {loadingData && (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Loading on-chain data...
        </div>
      )}

      {dataError && (
        <div className="rounded-md border border-dashed border-red-400 bg-red-50 p-3 text-sm text-red-700">
          {dataError}
        </div>
      )}

      {!loadingData && !dataError && config && stats ? (
        <div className="space-y-4 text-sm text-neutral-800">
          <div className="space-y-2">
            <span className="font-semibold">Write Your Receipt:</span>{" "}
            <span className="font-mono wrap-break-word">
              Receipt ID {stats.lastId + 1} to be stamped.
            </span>
            <p className="text-xs text-neutral-600">
              Use a variety of characters, but limit to 160 characters.
            </p>
            <form onSubmit={onSubmit} className="space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] tracking-[0.18em]">
                  YOUR RECEIPT
                </label>
                <textarea
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  rows={3}
                  maxLength={maxChars + 40} // hard cap safeguard
                  className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                  placeholder="I am living like someone who..."
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
                <span>
                  The stamp fee is {config.stampFee} µSTX and the receipt will
                  be stored on-chain.
                </span>
                <span className={isOverLimit ? "text-red-600" : ""}>
                  {remaining} chars left
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-700">
                <button
                  type="button"
                  onClick={() => onGiftChange(false)}
                  className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                    !isGift
                      ? "border-black bg-black text-white hover:bg-white hover:text-black"
                      : "border-black bg-white hover:bg-black hover:text-white"
                  }`}>
                  For me
                </button>
                <button
                  type="button"
                  onClick={() => onGiftChange(true)}
                  className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                    isGift
                      ? "border-black bg-black text-white hover:bg-white hover:text-black"
                      : "border-black bg-white hover:bg-black hover:text-white"
                  }`}>
                  As a gift
                </button>
              </div>
              {isGift && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] tracking-[0.18em]">
                      RECIPIENT ADDRESS
                    </label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => onRecipientChange(e.target.value)}
                      placeholder="SB... or SP..."
                      className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
                    <span>
                      This will be stored on-chain and linked to your STX
                      address.
                    </span>
                  </div>
                </>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
                {isSubmitting
                  ? "Stamping..."
                  : isGift
                  ? "Stamp as gift"
                  : "Stamp for me"}
              </button>
              {error && (
                <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              {recipientError && (
                <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {recipientError}
                </div>
              )}
              {txId && explorerUrl && (
                <div className="rounded-md border border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-800">
                  Receipt stamped.{" "}
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline">
                    View transaction on Stacks explorer.
                  </a>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
