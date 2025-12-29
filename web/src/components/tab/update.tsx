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

type UpdateTabProps = {
  loadingData: boolean;
  dataError: string | null;
  version: ContractVersion | null;
  config: ContractConfig | null;
  stats: ContractStats | null;
  cooling: boolean;
  cooldownMs: number;
  isAdmin: boolean;
  address: string | null;
  feeStampInput: string;
  feeRoyaltyInput: string;
  feeError: string | null;
  feeMessage: string | null;
  isUpdatingFees: boolean;
  newAdminInput: string;
  adminError: string | null;
  adminMessage: string | null;
  isUpdatingAdmin: boolean;
  onFeeStampChange: (value: string) => void;
  onFeeRoyaltyChange: (value: string) => void;
  onAdminChange: (value: string) => void;
  onSubmitFees: (event: React.FormEvent) => void;
  onSubmitAdmin: (event: React.FormEvent) => void;
  shorten: (addr?: string | null) => string;
};

export function UpdateTab({
  loadingData,
  dataError,
  version,
  config,
  stats,
  cooling,
  cooldownMs,
  isAdmin,
  address,
  feeStampInput,
  feeRoyaltyInput,
  feeError,
  feeMessage,
  isUpdatingFees,
  newAdminInput,
  adminError,
  adminMessage,
  isUpdatingAdmin,
  onFeeStampChange,
  onFeeRoyaltyChange,
  onAdminChange,
  onSubmitFees,
  onSubmitAdmin,
  shorten,
}: UpdateTabProps) {
  if (cooling) {
    return (
      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Update Contract
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
        Update Contract
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

      {!loadingData && !dataError && version && config && stats && !isAdmin ? (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          You&apos;re connected as{" "}
          <span className="font-semibold">{shorten(address)}</span>, but this is
          not the admin address. Only the admin can run on-chain actions.
        </div>
      ) : null}

      {!loadingData && !dataError && version && config && stats && isAdmin ? (
        <div className="space-y-4 text-sm text-neutral-800">
          <div className="space-y-2">
            <span className="font-semibold">Update Fees (on-chain):</span>{" "}
            <span className="font-mono wrap-break-word">...</span>
            <p className="text-xs text-neutral-600">
              Values are in microSTX (µSTX); 1 STX = 1,000,000 µSTX.
            </p>
            <form onSubmit={onSubmitFees} className="space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-[0.18em]">
                  STAMP-FEE (µSTX)
                </label>
                <input
                  type="text"
                  value={feeStampInput}
                  onChange={(e) => onFeeStampChange(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-[0.18em]">
                  ROYALTY-FEE (µSTX)
                </label>
                <input
                  type="text"
                  value={feeRoyaltyInput}
                  onChange={(e) => onFeeRoyaltyChange(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
                <span>
                  This will be stored on-chain and linked to your STX address.
                </span>
              </div>
              <button
                type="submit"
                disabled={isUpdatingFees}
                className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
                {isUpdatingFees ? "Updating…" : "Update Fees"}
              </button>
              {feeError && (
                <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {feeError}
                </div>
              )}
              {feeMessage && (
                <div className="rounded-md border border-green-500 bg-green-50 px-3 py-2 text-xs text-green-700">
                  {feeMessage}
                </div>
              )}
            </form>
          </div>

          <div className="space-y-2">
            <span className="font-semibold">Change Admin (on-chain):</span>{" "}
            <span className="font-mono wrap-break-word">...</span>
            <p className="text-xs text-neutral-600">
              Must be a valid Stacks address (starts with &quot;S&quot;).
            </p>
            <form onSubmit={onSubmitAdmin} className="space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-[0.18em]">
                  New admin address
                </label>
                <input
                  type="text"
                  value={newAdminInput}
                  onChange={(e) => onAdminChange(e.target.value)}
                  placeholder="S..."
                  className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-600">
                <span>
                  This will be stored on-chain and linked to your STX address.
                </span>
              </div>
              <button
                type="submit"
                disabled={isUpdatingAdmin}
                className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
                {isUpdatingAdmin ? "Updating…" : "Change Admin"}
              </button>
              {adminError && (
                <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {adminError}
                </div>
              )}
              {adminMessage && (
                <div className="rounded-md border border-green-500 bg-green-50 px-3 py-2 text-xs text-green-700">
                  {adminMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      ) : null}

      {!loadingData && !dataError && (!version || (!config && !stats)) && (
        <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
          Unable to load on-chain contract updaters. Verify the contract
          address/name and network.
        </div>
      )}
    </div>
  );
}
