import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet-button";

export function Navbar() {
  return (
    <header className="border-b border-black bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full border border-black" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">
              $MyReceipt
            </span>
            <span className="text-xs">Stacks Receipt of Life</span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/me"
            className="text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline">
            My Receipts
          </Link>
          <ConnectWalletButton />
        </nav>
      </div>
    </header>
  );
}
