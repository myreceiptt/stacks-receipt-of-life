"use client";

import { useEffect, useState } from "react";
import { renderReceiptImage } from "@/lib/receipt-canvas";

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
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!receipt) {
      setImageDataUrl(null);
      setIsRendering(false);
      return;
    }

    let cancelled = false;
    const createdAt = new Date(receipt.createdAt * 1000);
    const createdAtLabel = createdAt.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const renderImage = async () => {
      setIsRendering(true);
      const url = await renderReceiptImage({
        text: receipt.text,
        receiptId: receipt.id,
        creator: receipt.creator,
        createdAtLabel,
        pfpSrc: pfpSrc ?? "/nota-pfp.png",
      });
      if (!cancelled) {
        setImageDataUrl(url || null);
        setIsRendering(false);
      }
    };

    renderImage();

    return () => {
      cancelled = true;
    };
  }, [receipt, pfpSrc]);

  if (!isOpen || !receipt) return null;

  const handleCopyReceipt = async () => {
    if (!imageDataUrl || !navigator.clipboard?.write) return;
    try {
      setIsCopying(true);
      const blob = await (await fetch(imageDataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (err) {
      console.error("Failed to copy receipt image", err);
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!imageDataUrl) return;
    try {
      setIsDownloading(true);
      const link = document.createElement("a");
      link.href = imageDataUrl;
      link.download = `receipt-${receipt.id}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to download receipt image", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close receipt modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black text-xs font-semibold text-neutral-600 hover:bg-black hover:text-white">
          X
        </button>
        <div className="p-6 text-center">
          <div className="mx-auto w-full max-w-90">
            <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="aspect-1074/1474 w-full">
                {imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageDataUrl}
                    alt={`Receipt ${receipt.id}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/nota-inc.png"
                      alt={isRendering ? "Rendering receipt" : "Receipt"}
                      className={`h-10 w-auto object-contain ${
                        isRendering ? "animate-pulse" : ""
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleCopyReceipt}
            disabled={!imageDataUrl || isRendering || isCopying}
            className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
            {isCopying ? "Copying..." : "Copy Receipt"}
          </button>
          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={!imageDataUrl || isRendering || isDownloading}
            className="rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white disabled:opacity-60">
            {isDownloading ? "Downloading..." : "Download Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}
