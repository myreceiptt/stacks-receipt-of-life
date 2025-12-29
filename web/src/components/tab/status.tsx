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

type StatusTabProps = {
  loadingData: boolean;
  dataError: string | null;
  version: ContractVersion | null;
  config: ContractConfig | null;
  stats: ContractStats | null;
  cooling: boolean;
  cooldownMs: number;
};

export function StatusTab({
  loadingData,
  dataError,
  version,
  config,
  stats,
  cooling,
  cooldownMs,
}: StatusTabProps) {
  if (cooling) {
    return (
      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Contract Stats
        </p>
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Cooling down for {Math.max(0, Math.ceil(cooldownMs))} milliseconds and
          when done will loading on-chain data...
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
        Contract Stats
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

      {!loadingData &&
      !dataError &&
      version &&
      version.major === 2 &&
      config &&
      stats ? (
        <div className="space-y-4 text-sm text-neutral-800">
          <div className="space-y-2">
            <span className="font-semibold">Owner Address:</span>{" "}
            <span className="font-mono wrap-break-word">
              {config.contractOwner}
            </span>
            <p className="text-xs text-neutral-600">
              Address of Prof. NOTA v11.11 - myreceipt.btc
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">Treasury Address:</span>{" "}
            <span className="font-mono wrap-break-word">{config.treasury}</span>
            <p className="text-xs text-neutral-600">
              Address of Prof. NOTA v11.11 - myreceipt.btc
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">Admin Address:</span>{" "}
            <span className="font-mono wrap-break-word">{config.admin}</span>
            <p className="text-xs text-neutral-600">
              Address of Prof. NOTA v11.11 - myreceipt.btc
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">STAMP-FEE:</span>{" "}
            <span className="font-mono wrap-break-word">
              {config.stampFee} µSTX (≈ {config.stampFee / 1_000_000} STX)
            </span>
            <p className="text-xs text-neutral-600">
              Just a requirement to grow economic value on the Stacks
              blockchain.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">ROYALTY-FEE:</span>{" "}
            <span className="font-mono wrap-break-word">
              {config.royaltyFee} µSTX (≈ {config.royaltyFee / 1_000_000} STX)
            </span>
            <p className="text-xs text-neutral-600">
              The growth of economic value on the Stacks blockchain must be
              followed by your growth as well.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">Current Stats:</span>{" "}
            <span className="font-mono wrap-break-word">
              {new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <p className="text-xs text-neutral-600">
              Stats do not change in real time. Please refresh to update the
              stats.
            </p>
            <p className="text-xs text-neutral-600">
              <code>last-id</code>: {stats.lastId};
            </p>
            <p className="text-xs text-neutral-600">
              <code>total-submissions</code>: {stats.totalSubmissions}
            </p>
            <p className="text-xs text-neutral-600">
              <code>total-transfers</code>: {stats.totalTransfers}
            </p>
            <p className="text-xs text-neutral-600">
              <code>total-stamp-fee</code>: {stats.totalStampFee} µSTX (≈{" "}
              {stats.totalStampFee / 1_000_000} STX)
            </p>
            <p className="text-xs text-neutral-600">
              <code>total-royalty-fee</code>: {stats.totalRoyaltyFee} µSTX (≈{" "}
              {stats.totalRoyaltyFee / 1_000_000} STX)
            </p>
          </div>
        </div>
      ) : null}

      {!loadingData && !dataError && version && version.major === 1 && (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Legacy contract detected (v1.x). This UI uses v2 for normal flows; v1
          data shown here is informational only.
        </div>
      )}

      {!loadingData && !dataError && (!version || (!config && !stats)) && (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Unable to load on-chain contract stats. Verify the contract
          address/name and network.
        </div>
      )}
    </div>
  );
}
