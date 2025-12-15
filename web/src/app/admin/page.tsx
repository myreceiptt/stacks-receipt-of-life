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

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
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
      }
    };
    load();
  }, []);

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

  if (!address) {
    return (
      <section className="space-y-4">
        <p className="text-center text-sm text-neutral-700">
          Connect your wallet to view admin info.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
          Admin
        </p>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
          Receipt of Life · Admin Dashboard
        </h1>
        <p className="max-w-2xl text-sm text-neutral-700">
          On-chain configuration and admin tools for this contract on Stacks
          mainnet.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Contract &amp; Version
        </p>
        <div className="space-y-2 text-sm text-neutral-800">
          <div>
            <span className="font-semibold">Contract ID:</span>{" "}
            <span className="font-mono break-words">{contractId}</span>
          </div>
          <div>
            <span className="font-semibold">Version:</span>{" "}
            {version
              ? `v${version.major}.${version.minor}.${version.patch}`
              : "Version information not available."}
          </div>
          <div className="text-xs text-neutral-600">
            {version && version.major === 2
              ? "Active contract: Receipt of Life v2.x (Stacks mainnet)."
              : version && version.major === 1
              ? "Legacy contract: v1.x. This UI uses v2 for normal flows."
              : "Unable to determine contract version; please verify env and deployment."}
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-dashed border-neutral-400 bg-neutral-50 p-4 sm:p-6 text-sm text-neutral-800">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Legacy contract (read-only reference)
        </p>
        <div>
          <span className="font-semibold">V1 Contract ID:</span>{" "}
          <span className="font-mono break-words">
            SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life
          </span>
        </div>
        <p className="text-xs text-neutral-600">
          v1.x is considered legacy and is not used by this dApp UI.
          Integrations should target v2 (`receipt-of-life-v2`) for all features
          and fee safety.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Known limitation: STX self-transfer issue
        </p>
        <div className="mt-2 space-y-2 text-sm text-neutral-800">
          <p>
            v2 mitigates self-transfer: STAMP-FEE skipped when fee = 0 or
            tx-sender = TREASURY; ROYALTY-FEE skipped when fee = 0 or tx-sender
            = royalty-recipient.
          </p>
          <p>
            v1 can still fail when sender == recipient for fees. Avoid stamping
            or transferring when the fee recipient equals the sender (e.g. admin
            stamping to treasury, or owner = royalty-recipient).
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Config &amp; Stats
        </p>
        {loadingData && (
          <p className="text-sm text-neutral-700">Loading on-chain data…</p>
        )}
        {dataError && <p className="text-sm text-red-700">{dataError}</p>}

        {!loadingData &&
        !dataError &&
        version &&
        version.major === 2 &&
        config &&
        stats ? (
          <div className="space-y-3 text-sm text-neutral-800">
            <div>
              <span className="font-semibold">Contract Owner:</span>{" "}
              <span className="font-mono break-words">
                {config.contractOwner}
              </span>
            </div>
            <div>
              <span className="font-semibold">Treasury:</span>{" "}
              <span className="font-mono break-words">{config.treasury}</span>
            </div>
            <div>
              <span className="font-semibold">Admin:</span>{" "}
              <span className="font-mono break-words">{config.admin}</span>
            </div>
            <div>
              <span className="font-semibold">STAMP-FEE:</span>{" "}
              {config.stampFee} µSTX (≈ {config.stampFee / 1_000_000} STX)
            </div>
            <div>
              <span className="font-semibold">ROYALTY-FEE:</span>{" "}
              {config.royaltyFee} µSTX (≈ {config.royaltyFee / 1_000_000} STX)
            </div>
            <div className="pt-2">
              <p className="font-semibold">Stats</p>
              <div className="space-y-1">
                <div>last-id: {stats.lastId}</div>
                <div>total-submissions: {stats.totalSubmissions}</div>
                <div>total-transfers: {stats.totalTransfers}</div>
                <div>
                  total-stamp-fee: {stats.totalStampFee} µSTX (≈{" "}
                  {stats.totalStampFee / 1_000_000} STX)
                </div>
                <div>
                  total-royalty-fee: {stats.totalRoyaltyFee} µSTX (≈{" "}
                  {stats.totalRoyaltyFee / 1_000_000} STX)
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!loadingData && !dataError && version && version.major === 1 && (
          <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
            Legacy contract detected (v1.x). This UI uses v2 for normal flows;
            v1 data shown here is informational only.
          </div>
        )}

        {!loadingData && !dataError && (!version || (!config && !stats)) && (
          <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
            Unable to load on-chain config/stats. Verify the contract
            address/name and network.
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-black bg-white p-4 sm:p-6">
          <p className="text-sm text-neutral-800">
            You&apos;re connected as{" "}
            <span className="font-mono">{shorten(address)}</span>, but this is
            not the admin address. Only the admin can run on-chain actions.
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-black bg-white p-4 sm:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
              Update Fees (on-chain)
            </p>
            <p className="text-xs text-neutral-700">
              Values are in microSTX (1 STX = 1,000,000 microSTX).
            </p>
            <form onSubmit={handleSubmitFees} className="space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-[0.18em]">
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
                <label className="text-[11px] uppercase tracking-[0.18em]">
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

          <div className="space-y-2 rounded-xl border border-black bg-white p-4 sm:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
              Change Admin (on-chain)
            </p>
            <p className="text-xs text-neutral-700">
              Must be a valid Stacks address (starts with &quot;S&quot;).
            </p>
            <form onSubmit={handleSubmitAdmin} className="space-y-3 text-sm">
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
      )}
    </section>
  );
}
