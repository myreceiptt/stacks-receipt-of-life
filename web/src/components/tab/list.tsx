"use client";

type ListTabProps = {
  title?: string;
  message?: string;
};

export function ListTab({
  title = "Receipt Gallery",
  message = "Placeholder for the receipt gallery list. Content coming soon.",
}: ListTabProps) {
  return (
    <div className="space-y-4 rounded-xl border border-black bg-white p-4 sm:p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
        {title}
      </p>
      <div className="rounded-md border border-dashed border-neutral-400 bg-neutral-50 p-3 text-sm text-neutral-700">
        {message}
      </div>
    </div>
  );
}
