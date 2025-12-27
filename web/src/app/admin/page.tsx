"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useAppKitAccount } from "@reown/appkit/react";
import { ContractTab } from "@/components/tab/contract";
import { StatusTab } from "@/components/tab/status";
import { UpdateTab } from "@/components/tab/update";
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
  const { address: wcAddress } = useAppKitAccount({ namespace: "stacks" });
  const activeAddress = address ?? wcAddress ?? null;

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

  const handleRefresh = useCallback(async () => {
    if (!activeAddress) return;
    setLoadingData(true);
    setIsRefreshing(true);
    setDataError(null);
    setFeeError(null);
    setFeeMessage(null);
    setAdminError(null);
    setAdminMessage(null);
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
  }, [activeAddress]);

  useEffect(() => {
    if (!activeAddress) return;
    handleRefresh();
  }, [activeAddress, handleRefresh]);

  const effectiveAdmin = useMemo(() => {
    if (version?.major === 2 && config?.admin) return config.admin;
    return envAdmin.trim();
  }, [version?.major, config?.admin, envAdmin]);

  const isAdmin = useMemo(() => {
    return !!activeAddress && !!effectiveAdmin && activeAddress === effectiveAdmin;
  }, [activeAddress, effectiveAdmin]);

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
            {!activeAddress && (
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Connect to View Admin Info.
              </h1>
            )}
            {activeAddress && (
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Your Admin Dashboard.
              </h1>
            )}
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
          On-chain configuration and admin tools for the{" "}
          <span className="font-bold">$MyReceipt</span> contract on{" "}
          <span className="font-bold">Stacks mainnet</span>.
        </p>
      </header>

      {!activeAddress && (
        <div className="rounded-md border border-dashed border-black bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Connect your Stacks wallet in the navbar to see admin info.
        </div>
      )}

      {activeAddress && (
        <div className="space-y-4">
          <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
            You can review the contract details, see the latest on-chain stats,
            and, if you&apos;re the admin, update fees or change the admin
            address. This page keeps settings and status transparent and up to
            date.
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
            <ContractTab
              version={version}
              contractId={contractId}
              loadingData={loadingData}
              dataError={dataError}
              config={config}
              stats={stats}
            />
          )}

          {activeTab === "status" && (
            <StatusTab
              loadingData={loadingData}
              dataError={dataError}
              version={version}
              config={config}
              stats={stats}
            />
          )}

          {activeTab === "update" && (
            <UpdateTab
              loadingData={loadingData}
              dataError={dataError}
              version={version}
              config={config}
              stats={stats}
              isAdmin={isAdmin}
              address={activeAddress}
              feeStampInput={feeStampInput}
              feeRoyaltyInput={feeRoyaltyInput}
              feeError={feeError}
              feeMessage={feeMessage}
              isUpdatingFees={isUpdatingFees}
              newAdminInput={newAdminInput}
              adminError={adminError}
              adminMessage={adminMessage}
              isUpdatingAdmin={isUpdatingAdmin}
              onFeeStampChange={setFeeStampInput}
              onFeeRoyaltyChange={setFeeRoyaltyInput}
              onAdminChange={setNewAdminInput}
              onSubmitFees={handleSubmitFees}
              onSubmitAdmin={handleSubmitAdmin}
              shorten={shorten}
            />
          )}
        </div>
      )}
    </section>
  );
}
