"use client";

import { useMemo } from "react";
import { useWallet } from "@/hooks/use-wallet";

const shorten = (addr?: string | null) => {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
};

export default function AdminPage() {
  const { address } = useWallet();

  const contractAddress =
    process.env.NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS ?? "";
  const adminAddress = process.env.NEXT_PUBLIC_RECEIPT_ADMIN_ADDRESS ?? "";
  const stampFeeMicro = Number(
    process.env.NEXT_PUBLIC_RECEIPT_STAMP_FEE_MICRO ?? 0
  );
  const royaltyFeeMicro = Number(
    process.env.NEXT_PUBLIC_RECEIPT_ROYALTY_FEE_MICRO ?? 0
  );

  const stampFeeStx = stampFeeMicro / 1_000_000;
  const royaltyFeeStx = royaltyFeeMicro / 1_000_000;

  const isAdmin = useMemo(
    () => !!address && !!adminAddress && address === adminAddress,
    [address, adminAddress]
  );

  if (!address) {
    return (
      <section className="space-y-4">
        <p className="text-center text-sm text-neutral-700">
          Connect your wallet to view admin info.
        </p>
      </section>
    );
  }

  if (address && !isAdmin) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-black bg-white p-4 sm:p-6">
          <p className="text-sm text-neutral-800">
            You&apos;re connected as{" "}
            <span className="font-mono">{shorten(address)}</span>, but this is
            NOT the admin address. Only the admin can view sensitive
            configuration.
          </p>
        </div>
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
          Read-only view of contract configuration pulled from environment
          variables. On-chain truth is still enforced by the contract on Stacks
          mainnet.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-black bg-white p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Contract &amp; Admin
          </p>
          <div className="space-y-1 text-sm text-neutral-800">
            <div>
              <span className="font-semibold">Contract:</span>{" "}
              <span className="font-mono break-words">{contractAddress}</span>{" "}
              <span className="text-neutral-500">
                ({shorten(contractAddress)})
              </span>
            </div>
            <div>
              <span className="font-semibold">Admin:</span>{" "}
              <span className="font-mono break-words">{adminAddress}</span>{" "}
              <span className="text-neutral-500">({shorten(adminAddress)})</span>
            </div>
            <p className="text-xs text-neutral-600">
              These values come from NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS and
              NEXT_PUBLIC_RECEIPT_ADMIN_ADDRESS. To change them, edit the Vercel
              environment, redeploy, and double-check carefully.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-black bg-white p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Fee hints (UI only)
          </p>
          <div className="space-y-1 text-sm text-neutral-800">
            <div>
              <span className="font-semibold">STAMP-FEE:</span>{" "}
              {stampFeeMicro} µSTX (≈ {stampFeeStx} STX)
            </div>
            <div>
              <span className="font-semibold">ROYALTY-FEE:</span>{" "}
              {royaltyFeeMicro} µSTX (≈ {royaltyFeeStx} STX)
            </div>
            <p className="text-xs text-neutral-600">
              These numbers are UI hints from .env. The real on-chain values are
              stored in the contract&apos;s data-vars. To change on-chain fees,
              the admin must call set-fees from the admin wallet (UI for that is
              coming later).
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          Known limitation: STX self-transfer issue
        </p>
        <div className="mt-2 space-y-2 text-sm text-neutral-800">
          <p>
            When STAMP-FEE or ROYALTY-FEE sends STX from an address back to the
            same address (sender == recipient), the transaction fails with
            (err u2) on-chain.
          </p>
          <p>Examples:</p>
          <ul className="list-disc space-y-1 pl-5 text-neutral-800">
            <li>
              The admin/treasury wallet stamps a receipt for itself (fee goes
              from admin to admin).
            </li>
            <li>
              A receipt is transferred while the royalty-recipient equals the
              current owner (owner pays royalty to themselves).
            </li>
          </ul>
          <p className="text-xs text-neutral-700">
            Recommendation: avoid stamping with the admin/treasury wallet as the
            fee recipient. Before transferring a receipt where you are both
            owner and royalty-recipient, change the royalty recipient to a
            different address first.
          </p>
        </div>
      </div>
    </section>
  );
}
