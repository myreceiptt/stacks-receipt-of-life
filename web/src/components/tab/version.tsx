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

type VersionTabProps = {
  version: ContractVersion | null;
  contractId: string;
  loadingData: boolean;
  dataError: string | null;
  config: ContractConfig | null;
  stats: ContractStats | null;
  cooling: boolean;
  cooldownMs: number;
};

export function VersionTab({
  version,
  contractId,
  loadingData,
  dataError,
  config,
  stats,
  cooling,
  cooldownMs,
}: VersionTabProps) {
  if (cooling) {
    return (
      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Contract Version
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
        Contract Version
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

      {!loadingData && !dataError && version ? (
        <div className="space-y-4 text-sm text-neutral-800">
          <div className="space-y-2">
            <span className="font-semibold">Contract Version:</span>{" "}
            <span className="font-mono wrap-break-word">
              {version
                ? `v${version.major}.${version.minor}.${version.patch}`
                : "Version information not available."}
            </span>
            <p className="text-xs text-neutral-600">
              {version && version.major === 2
                ? "Active contract: Receipt of Life v2.x (Stacks mainnet)."
                : version && version.major === 1
                ? "Legacy contract: v1.x. This UI uses v2 for normal flows."
                : "Unable to determine contract version; please verify env and deployment."}
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">Known Limitation:</span>{" "}
            <span className="font-mono wrap-break-word">
              STX self-transfer issue.
            </span>
            <p className="text-xs text-neutral-600">
              v1 can still fail when sender == recipient for fees. Avoid
              stamping or transferring when the fee recipient equals the sender
              (e.g. admin stamping to treasury, or owner = royalty-recipient).
            </p>
            <p className="text-xs text-neutral-600">
              v2 mitigates self-transfer: STAMP-FEE skipped when fee = 0 or
              tx-sender = TREASURY; ROYALTY-FEE skipped when fee = 0 or
              tx-sender = royalty-recipient.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">V2 Contract ID:</span>{" "}
            <span className="font-mono wrap-break-word">{contractId}</span>
            <p className="text-xs text-neutral-600">
              v2.x is currently used contract. Integrations should target v2
              (`receipt-of-life-v2`) for all features and fee safety.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">V1 Contract ID:</span>{" "}
            <span className="font-mono wrap-break-word">
              SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life
            </span>
            <p className="text-xs text-neutral-600">
              v1.x is considered a legacy contract and is not used by this dApp
              UI (read-only reference).
            </p>
          </div>
        </div>
      ) : null}

      {!loadingData && !dataError && (!version || (!config && !stats)) && (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Unable to load on-chain contract version. Verify the contract
          address/name and network.
        </div>
      )}
    </div>
  );
}
