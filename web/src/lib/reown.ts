// web/lib/reown.ts
import type { AppKitNetwork } from "@reown/appkit/networks";
import type { CustomCaipNetwork } from "@reown/appkit-common";
import { UniversalConnector } from "@reown/appkit-universal-connector";

export const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "REPLACE_ME";

if (!projectId) {
  throw new Error("Reown projectId not set");
}

const stacksMainnet: CustomCaipNetwork<"stacks"> = {
  id: 1, // we’ll refine this
  chainNamespace: "stacks",
  caipNetworkId: "stacks:mainnet", // we’ll confirm exact CAIP string
  name: "Stacks Mainnet",
  nativeCurrency: {
    name: "Stacks",
    symbol: "STX",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://stacks-node-api.mainnet.stacks.co"],
    },
  },
};

export const networks = [stacksMainnet] as [AppKitNetwork, ...AppKitNetwork[]];

let universalConnectorPromise: Promise<UniversalConnector> | null = null;

export function getUniversalConnector() {
  if (!universalConnectorPromise) {
    universalConnectorPromise = UniversalConnector.init({
      projectId,
      metadata: {
        name: "Stacks Receipt of Life",
        description: "NOTA as a receipt of life on Stacks",
        url: "https://stacks.endhonesa.com",
        icons: ["https://stacks.endhonesa.com/icon.png"],
      },
      networks: [
        {
          methods: [
            // we’ll list Stacks RPC methods needed for contract calls
          ],
          chains: [stacksMainnet as CustomCaipNetwork<"stacks">],
          events: [],
          namespace: "stacks",
        },
      ],
    });
  }
  return universalConnectorPromise;
}
