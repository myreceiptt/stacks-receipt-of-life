"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import {
  getVersion,
  getConfig,
  getStats,
  setFees,
  setAdmin as setAdminOnChain,
  CONTRACT_NAME,
  CONTRACT_ADDRESS,
} from "@/lib/receipt-contract";

const shorten = (addr?: string | null) => {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
};

const contractName = CONTRACT_NAME;
const contractAddressEnv = CONTRACT_ADDRESS;
const contractId =
  contractAddressEnv && contractName
    ? `${contractAddressEnv}.${contractName}`
    : contractName;

export default function AdminPage() {
  const { address } = useWallet();

  const envAdmin = process.env.NEXT_PUBLIC_RECEIPT_ADMIN_ADDRESS ?? "";
  const envStampFee = Number(
    process.env.NEXT_PUBLIC_RECEIPT_STAMP_FEE_MICRO ?? 0
  );
  const envRoyaltyFee = Number(
    process.env.NEXT_PUBLIC_RECEIPT_ROYALTY_FEE_MICRO ?? 0
  );

  const [version, setVersionState] = useState<{
    major: number;
    minor: number;
    patch: number;
  } | null>(null);
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

  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [feeStampInput, setFeeStampInput] = useState<string>(
    envStampFee.toString()
  );
  const [feeRoyaltyInput, setFeeRoyaltyInput] = useState<string>(
    envRoyaltyFee.toString()
  );
  const [feeMessage, setFeeMessage] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [isUpdatingFees, setIsUpdatingFees] = useState(false);

  const [newAdminInput, setNewAdminInput] = useState<string>("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"contract" | "status" | "update">(
    "contract"
  );

  const handleRefresh = async () => {
    if (!address) return;
    setLoadingData(true);
    setIsRefreshing(true);
    setDataError(null);
    try {
      const [ver, cfg, st] = await Promise.all([
        getVersion(),
        getConfig(),
        getStats(),
      ]);
      if (ver) setVersionState(ver);
      if (cfg) {
        setConfigState(cfg);
        setFeeStampInput(cfg.stampFee.toString());
        setFeeRoyaltyInput(cfg.royaltyFee.toString());
      }
      if (st) setStatsState(st);
    } catch (err) {
      console.error(err);
      setDataError(
        "Unable to fetch contract version/config on mainnet. Check NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS and NEXT_PUBLIC_RECEIPT_CONTRACT_NAME."
      );
    } finally {
      setLoadingData(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!address) return;
    handleRefresh();
  }, [address]);

  const effectiveAdmin = useMemo(() => {
    if (version?.major === 2 && config?.admin) return config.admin;
    return envAdmin.trim();
  }, [version?.major, config?.admin, envAdmin]);

  const isAdmin = useMemo(() => {
    return !!address && !!effectiveAdmin && address === effectiveAdmin;
  }, [address, effectiveAdmin]);

  const handleSubmitFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeError(null);
    setFeeMessage(null);
    const stamp = feeStampInput.trim();
    const royalty = feeRoyaltyInput.trim();

    if (!/^[0-9]+$/.test(stamp) || !/^[0-9]+$/.test(royalty)) {
      setFeeError("Enter non-negative integer values in microSTX.");
      return;
    }

    try {
      setIsUpdatingFees(true);
      await setFees(BigInt(stamp), BigInt(royalty));
      setFeeMessage("Fees updated on-chain.");
      // refresh config/stats
      const [cfg, st] = await Promise.all([getConfig(), getStats()]);
      if (cfg) {
        setConfigState(cfg);
        setFeeStampInput(cfg.stampFee.toString());
        setFeeRoyaltyInput(cfg.royaltyFee.toString());
      }
      if (st) setStatsState(st);
    } catch (err) {
      console.error(err);
      setFeeError(
        "Failed to update fees. Check that you are admin and your values are valid."
      );
    } finally {
      setIsUpdatingFees(false);
    }
  };

  const handleSubmitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminMessage(null);

    const nextAdmin = newAdminInput.trim();
    if (!nextAdmin || !nextAdmin.startsWith("S")) {
      setAdminError("Enter a valid Stacks address (starts with 'S').");
      return;
    }

    try {
      setIsUpdatingAdmin(true);
      await setAdminOnChain(nextAdmin);
      setAdminMessage(
        "Admin updated on-chain. Remember you may lose admin access if this is a different address."
      );
      const cfg = await getConfig();
      if (cfg) setConfigState(cfg);
    } catch (err) {
      console.error(err);
      setAdminError(
        "Failed to update admin. Check permissions and address validity."
      );
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
              Admin · config + stats
            </p>
            {!address && (
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Connect to View Admin Info.
              </h1>
            )}
            {address && (
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Your Admin Dashboard.
              </h1>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {address && (
              <span className="rounded-full border border-black bg-white px-3 py-1 font-mono">
                {address.slice(0, 8)}…{address.slice(-4)}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={!address || loadingData}
              className="rounded-full border border-black bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] disabled:opacity-40">
              {isRefreshing || loadingData ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          On-chain configuration and admin tools for the{" "}
          <span className="font-bold">$MyReceipt</span> contract on{" "}
          <span className="font-bold">Stacks mainnet</span>.
        </p>
      </header>

      {!address && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar to see admin info.
        </div>
      )}

      {address && (
        <div className="space-y-4">
          <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
            You can review the contract details, see the latest on-chain stats,
            and, if you're the admin, update fees or change the admin address.
            This page keeps settings and status transparent and up to date.
          </p>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("contract")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "contract"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Contract
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("status")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "status"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Status
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("update")}
              className={`rounded-full border px-3 py-1 uppercase tracking-[0.18em] ${
                activeTab === "update"
                  ? "border-black bg-black text-white"
                  : "border-black bg-white"
              }`}>
              Update
            </button>
          </div>

          {activeTab === "contract" && (
            <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                Contract Version
              </p>

              {loadingData && (
                <p className="text-sm text-neutral-700">
                  Loading on-chain data...
                </p>
              )}

              {dataError && <p className="text-sm text-red-700">{dataError}</p>}

              {!loadingData && !dataError && version && config && stats ? (
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
                      stamping or transferring when the fee recipient equals the
                      sender (e.g. admin stamping to treasury, or owner =
                      royalty-recipient).
                    </p>
                    <p className="text-xs text-neutral-600">
                      v2 mitigates self-transfer: STAMP-FEE skipped when fee = 0
                      or tx-sender = TREASURY; ROYALTY-FEE skipped when fee = 0
                      or tx-sender = royalty-recipient.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">V2 Contract ID:</span>{" "}
                    <span className="font-mono wrap-break-word">
                      {contractId}
                    </span>
                    <p className="text-xs text-neutral-600">
                      v2.x is currently used contract. Integrations should
                      target v2 (`receipt-of-life-v2`) for all features and fee
                      safety.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">V1 Contract ID:</span>{" "}
                    <span className="font-mono wrap-break-word">
                      SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life
                    </span>
                    <p className="text-xs text-neutral-600">
                      v1.x is considered a legacy contract and is not used by
                      this dApp UI (read-only reference).
                    </p>
                  </div>
                </div>
              ) : null}

              {!loadingData &&
                !dataError &&
                (!version || (!config && !stats)) && (
                  <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Unable to load on-chain contract version. Verify the
                    contract address/name and network.
                  </div>
                )}
            </div>
          )}

          {activeTab === "status" && (
            <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                Contract Stats
              </p>

              {loadingData && (
                <p className="text-sm text-neutral-700">
                  Loading on-chain data...
                </p>
              )}

              {dataError && <p className="text-sm text-red-700">{dataError}</p>}

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
                    <span className="font-mono wrap-break-word">
                      {config.treasury}
                    </span>
                    <p className="text-xs text-neutral-600">
                      Address of Prof. NOTA v11.11 - myreceipt.btc
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">Admin Address:</span>{" "}
                    <span className="font-mono wrap-break-word">
                      {config.admin}
                    </span>
                    <p className="text-xs text-neutral-600">
                      Address of Prof. NOTA v11.11 - myreceipt.btc
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">STAMP-FEE:</span>{" "}
                    <span className="font-mono wrap-break-word">
                      {config.stampFee} µSTX (≈ {config.stampFee / 1_000_000}{" "}
                      STX)
                    </span>
                    <p className="text-xs text-neutral-600">
                      Just a requirement to grow economic value on the Stacks
                      blockchain.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">ROYALTY-FEE:</span>{" "}
                    <span className="font-mono wrap-break-word">
                      {config.royaltyFee} µSTX (≈{" "}
                      {config.royaltyFee / 1_000_000} STX)
                    </span>
                    <p className="text-xs text-neutral-600">
                      The growth of economic value on the Stacks blockchain must
                      be followed by your growth as well.
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
                      Stats do not change in real time. Please refresh to update
                      the stats.
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
                      <code>total-stamp-fee</code>: {stats.totalStampFee} µSTX
                      (≈ {stats.totalStampFee / 1_000_000} STX)
                    </p>
                    <p className="text-xs text-neutral-600">
                      <code>total-royalty-fee</code>: {stats.totalRoyaltyFee}{" "}
                      µSTX (≈ {stats.totalRoyaltyFee / 1_000_000} STX)
                    </p>
                  </div>
                </div>
              ) : null}

              {!loadingData && !dataError && version && version.major === 1 && (
                <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                  Legacy contract detected (v1.x). This UI uses v2 for normal
                  flows; v1 data shown here is informational only.
                </div>
              )}

              {!loadingData &&
                !dataError &&
                (!version || (!config && !stats)) && (
                  <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Unable to load on-chain contract stats. Verify the contract
                    address/name and network.
                  </div>
                )}
            </div>
          )}

          {activeTab === "update" && (
            <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                Update Contract
              </p>

              {loadingData && (
                <p className="text-sm text-neutral-700">
                  Loading on-chain data...
                </p>
              )}

              {dataError && <p className="text-sm text-red-700">{dataError}</p>}

              {!loadingData &&
              !dataError &&
              version &&
              config &&
              stats &&
              !isAdmin ? (
                <p className="text-sm text-neutral-700">
                  You&apos;re connected as{" "}
                  <span className="font-semibold">{shorten(address)}</span>, but
                  this is not the admin address. Only the admin can run on-chain
                  actions.
                </p>
              ) : null}

              {!loadingData &&
              !dataError &&
              version &&
              config &&
              stats &&
              isAdmin ? (
                <div className="space-y-4 text-sm text-neutral-800">
                  <div className="space-y-2">
                    <span className="font-semibold">
                      Update Fees (on-chain):
                    </span>{" "}
                    <span className="font-mono wrap-break-word"></span>
                    <p className="text-xs text-neutral-600">
                      Values are in microSTX (µSTX); 1 STX = 1,000,000 µSTX.
                    </p>
                    <form
                      onSubmit={handleSubmitFees}
                      className="space-y-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] tracking-[0.18em]">
                          STAMP-FEE (µSTX)
                        </label>
                        <input
                          type="text"
                          value={feeStampInput}
                          onChange={(e) => setFeeStampInput(e.target.value)}
                          className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] tracking-[0.18em]">
                          ROYALTY-FEE (µSTX)
                        </label>
                        <input
                          type="text"
                          value={feeRoyaltyInput}
                          onChange={(e) => setFeeRoyaltyInput(e.target.value)}
                          className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
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
                      <button
                        type="submit"
                        disabled={isUpdatingFees}
                        className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
                        {isUpdatingFees ? "Updating…" : "Update Fees"}
                      </button>
                    </form>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">
                      Change Admin (on-chain):
                    </span>{" "}
                    <span className="font-mono wrap-break-word"></span>
                    <p className="text-xs text-neutral-600">
                      Must be a valid Stacks address (starts with
                      &quot;S&quot;).
                    </p>
                    <form
                      onSubmit={handleSubmitAdmin}
                      className="space-y-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] uppercase tracking-[0.18em]">
                          New admin address
                        </label>
                        <input
                          type="text"
                          value={newAdminInput}
                          onChange={(e) => setNewAdminInput(e.target.value)}
                          placeholder="S..."
                          className="w-full border border-black px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
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
                      <button
                        type="submit"
                        disabled={isUpdatingAdmin}
                        className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
                        {isUpdatingAdmin ? "Updating…" : "Change Admin"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}

              {!loadingData &&
                !dataError &&
                (!version || (!config && !stats)) && (
                  <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
                    Unable to load on-chain contract updaters. Verify the
                    contract address/name and network.
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
