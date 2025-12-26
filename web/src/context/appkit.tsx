"use client";

import type { ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { BitcoinAdapter } from "@reown/appkit-adapter-bitcoin";
import {
  bitcoin,
  bitcoinTestnet,
  bitcoinSignet,
} from "@reown/appkit/networks";

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  // We don't throw here to avoid breaking the app in local/dev,
  // but we log so the dev knows why the AppKit button might not work.
  console.warn(
    "Reown AppKit: NEXT_PUBLIC_REOWN_PROJECT_ID is not set. AppKit will not be initialized."
  );
}

const metadata = {
  name: "Stacks Receipt of Life",
  description: "Stacks dApp with Reown AppKit integration",
  url: "http://localhost:3000",
  icons: ["https://appkit.reown.com/icon.png"],
};

if (projectId) {
  const bitcoinAdapter = new BitcoinAdapter({ projectId });

  createAppKit({
    adapters: [bitcoinAdapter],
    metadata,
    networks: [bitcoin, bitcoinTestnet, bitcoinSignet],
    projectId,
    features: {
      analytics: true,
    },
  });
}

export function AppKit({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
