"use client";

type ReceiptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  receipt: {
    id: number;
    text: string;
    creator: string;
    createdAt: number;
  } | null;
  pfpSrc?: string | null;
};

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  pfpSrc,
}: ReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const createdAt = new Date(receipt.createdAt * 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close receipt modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-black bg-white p-6 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full border border-black px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-600 hover:bg-black hover:text-white">
          Close
        </button>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-2xl font-semibold tracking-tight">
              Prof. NOTA <span className="text-base align-top">Inc.</span>
            </p>
            <p className="text-sm text-neutral-500">...</p>
          </div>

          <div className="space-y-4 text-base text-neutral-900">
            <p className="whitespace-pre-wrap wrap-break-word">
              {receipt.text}
            </p>
            <div className="space-y-1 text-xs text-neutral-600">
              <div>Receipt ID: {receipt.id}</div>
              <div>
                Date:{" "}
                {createdAt.toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="font-mono">
                Creator: {receipt.creator.slice(0, 8)}…
                {receipt.creator.slice(-4)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-neutral-500">...</p>
            {pfpSrc ? (
              <img
                src={pfpSrc}
                alt="Prof. NOTA"
                className="mx-auto h-28 w-28 rounded-full border border-black object-cover"
              />
            ) : (
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-black text-xs uppercase tracking-[0.18em] text-neutral-600">
                Prof. NOTA
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
