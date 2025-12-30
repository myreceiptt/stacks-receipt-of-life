"use client";

import { shortenAddress } from "@/lib/formatters";

type ExplorerLinkProps = {
  label: string;
  href: string;
  text: string;
};

export function ExplorerLink({ label, href, text }: ExplorerLinkProps) {
  return (
    <div className="mt-1 text-[11px] text-neutral-600">
      {label}:{" "}
      <a href={href} target="_blank" rel="noreferrer" className="underline">
        {shortenAddress(text)}
      </a>{" "}
      <span className="font-mono">(View on Explorer)</span>
    </div>
  );
}
