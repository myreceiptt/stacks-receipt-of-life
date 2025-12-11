import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-black bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full border border-black" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">
              NOTA
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
          <button
            className="rounded-full border border-black px-4 py-1 text-xs font-medium uppercase tracking-[0.18em]"
            disabled>
            Connect wallet
          </button>
        </nav>
      </div>
    </header>
  );
}
