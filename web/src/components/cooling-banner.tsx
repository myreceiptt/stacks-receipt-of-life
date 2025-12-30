"use client";

type CoolingBannerProps = {
  label: string;
  remainingMs: number;
};

export function CoolingBanner({ label, remainingMs }: CoolingBannerProps) {
  return (
    <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
        {label}
      </p>
      <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
        Cooling down for {Math.max(0, Math.ceil(remainingMs))} milliseconds and
        then loading on-chain data...
      </div>
    </div>
  );
}
