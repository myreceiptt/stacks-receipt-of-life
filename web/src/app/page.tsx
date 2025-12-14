import { StampReceiptSection } from "@/components/stamp-receipt-section";

export default function HomePage() {
  return (
    <section className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
          Receipt of life · v2.1.11
        </p>
        <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
          Stamp your Receipt on Stacks.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Write one sentence that feels like a receipt for how you live today.
        </p>
      </div>

      <StampReceiptSection />
    </section>
  );
}
