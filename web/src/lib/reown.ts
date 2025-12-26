import type { AppKitNetwork } from "@reown/appkit/networks";
import type { CustomCaipNetwork } from "@reown/appkit-common";
import { UniversalConnector } from "@reown/appkit-universal-connector";

const fallbackProjectId = "b56e18d47c72ab683b10814fe9495694";

export const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? fallbackProjectId;

if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) {
  console.warn(
    "NEXT_PUBLIC_REOWN_PROJECT_ID is not set; using the public demo id for local development."
  );
}

const suiMainnet = {
  id: 1,
  chainNamespace: "sui",
  caipNetworkId: "sui:mainnet",
  name: "Sui",
  nativeCurrency: {
    name: "SUI",
    symbol: "SUI",
    decimals: 9,
  },
  rpcUrls: {
    default: {
      http: ["https://fullnode.mainnet.sui.io:443"],
    },
  },
} as CustomCaipNetwork<"sui">;

const stacksMainnet = {
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
      http: ["https://stacks-node-mainnet.stacks.co"],
    },
  },
} as CustomCaipNetwork<"stacks">;

export const networks = [suiMainnet, stacksMainnet] as [
  AppKitNetwork,
  ...AppKitNetwork[]
];

let universalConnector: UniversalConnector | undefined;

export async function getUniversalConnector() {
  if (universalConnector) {
    return universalConnector;
  }

  universalConnector = await UniversalConnector.init({
    projectId,
    metadata: {
      name: "Stacks Receipt of Life",
      description: "Wallet connection for stacks-receipt-of-life dApp",
      url: "http://localhost:3000",
      icons: ["https://appkit.reown.com/icon.png"],
    },
    networks: [
      {
        namespace: "sui",
        methods: ["sui_signPersonalMessage"],
        events: [],
        chains: [suiMainnet],
      },
      {
        namespace: "stacks",
        methods: [
          "stx_getAddresses",
          "stx_signMessage",
          "stx_transferStx",
          "stx_signTransaction",
          "stx_callContract",
        ],
        events: ["stx_chainChanged"],
        chains: [stacksMainnet],
      },
    ],
  });

  return universalConnector;
}
