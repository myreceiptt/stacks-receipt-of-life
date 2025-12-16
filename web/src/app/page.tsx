import { StampReceiptSection } from "@/components/stamp-receipt-section";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
              Receipt of Life · v2.2.01
            </p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
              Stamp Your Receipt on Stacks.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]"></div>
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Write and stamp a <span className="font-bold">Receipt of Life</span>{" "}
          using <span className="font-bold">$MyReceipt</span> contract secured
          by <span className="font-bold">Bitcoin</span> via{" "}
          <span className="font-bold">Stacks mainnet</span>.
        </p>
      </header>

      <StampReceiptSection />
    </section>
  );
}
