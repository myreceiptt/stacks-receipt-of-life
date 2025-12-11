export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-600">
          Receipt of life · v0.1
        </p>
        <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
          Stamp your NOTA on Stacks.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-700">
          Write one sentence that feels like a receipt for how you live today.
          Soon, you&apos;ll be able to mint it as an on-chain Receipt of Life
          secured by Bitcoin via Stacks.
        </p>
      </div>

      <div className="rounded-xl border border-black bg-white p-4 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-600">
          Coming next
        </p>
        <p className="mt-2 text-sm text-neutral-800">
          This is the landing shell. In the next steps we will connect your
          Stacks wallet and add the form to stamp your first NOTA.
        </p>
      </div>
    </section>
  );
}
