"use client";

import type { ReactNode } from "react";
import { createAppKit } from "@reown/appkit/react";
import { networks, projectId } from "@/lib/reown-stacks";

const metadata = {
  name: "Stacks Receipt of Life",
  description: "Stacks dApp with Reown AppKit integration",
  url: "http://localhost:3000",
  icons: ["https://appkit.reown.com/icon.png"],
};

if (projectId) {
  createAppKit({
    metadata,
    networks,
    projectId,
    features: {
      analytics: true,
    },
  });
}

export function AppKit({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
