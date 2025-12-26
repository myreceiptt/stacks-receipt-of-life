"use client";
import Link from "next/link";
import Image from "next/image";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useWallet } from "@/hooks/use-wallet";

export function Navbar() {
  const { address } = useWallet();
  const isConnected = !!address;

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
            href="/"
            className="rounded-full border border-black bg-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black">
            Activity
          </Link>
          {isConnected && (
            <Link
              href="/me"
              className="rounded-full border border-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] hover:bg-black hover:text-white">
              Receipts
            </Link>
          )}
          {isConnected && (
            <Link
              href="/admin"
              className="rounded-full border border-black bg-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black">
              Admin
            </Link>
          )}
          <ConnectWalletButton />
        </nav>
      </div>
    </header>
  );
}
