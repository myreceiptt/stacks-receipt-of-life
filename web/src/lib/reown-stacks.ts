// web/src/lib/reown-stacks.ts

import type { AppKitNetwork } from "@reown/appkit/networks";
import type { CustomCaipNetwork } from "@reown/appkit-common";
import { UniversalConnector } from "@reown/appkit-universal-connector";

const FALLBACK_PROJECT_ID = "b56e18d47c72ab683b10814fe9495694";

export const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? FALLBACK_PROJECT_ID;

// Jangan throw untuk local dev, cukup warning
if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) {
  console.warn(
    "Reown Stacks: NEXT_PUBLIC_REOWN_PROJECT_ID is not set; using public demo projectId for local development."
  );
}

const stacksMainnet: CustomCaipNetwork<"stacks"> = {
  id: 1,
  chainNamespace: "stacks",
  caipNetworkId: "stacks:1",
  name: "Stacks",
  nativeCurrency: {
    name: "STX",
    symbol: "STX",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      // node API mainnet (boleh adjust kalau app sudah pakai endpoint lain)
      http: ["https://stacks-node-api.mainnet.stacks.co"],
    },
  },
};

export const networks = [stacksMainnet] as [AppKitNetwork];

let connectorPromise: Promise<UniversalConnector> | null = null;

export async function getStacksUniversalConnector() {
  if (!connectorPromise) {
    connectorPromise = UniversalConnector.init({
      projectId,
      metadata: {
        name: "Stacks Receipt of Life",
        description: "Stacks dApp using WalletConnect UniversalConnector",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://stacks-receipt-of-life.local",
        icons: ["https://appkit.reown.com/icon.png"],
      },
      networks: [
        {
          namespace: "stacks",
          chains: [stacksMainnet],
          methods: [
            "stx_getAddresses",
            "stx_transferStx",
            "stx_signTransaction",
            "stx_signMessage",
            "stx_signStructuredMessage",
            "stx_callContract",
          ],
          events: ["stx_chainChanged"],
        },
      ],
    });
  }

  return connectorPromise;
}
