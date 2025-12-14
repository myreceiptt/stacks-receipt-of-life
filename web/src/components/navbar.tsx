"use client";
import Link from "next/link";
import Image from "next/image";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useWallet } from "@/hooks/use-wallet";

export function Navbar() {
  const { address } = useWallet();
  const adminAddress = process.env.NEXT_PUBLIC_RECEIPT_ADMIN_ADDRESS ?? "";
  const isAdmin = !!address && !!adminAddress && address === adminAddress;

  return (
    <header className="border-b border-black bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-black object-cover"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">
              $MyReceipt
            </span>
            <span className="text-xs">Stacks Receipt of Life</span>
          </div>
        </Link>

        <nav className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
          <Link
            href="/me"
            className="text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline">
            My Receipts
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline">
              Admin
            </Link>
          )}
          <ConnectWalletButton />
        </nav>
      </div>
    </header>
  );
}
