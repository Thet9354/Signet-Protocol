import { createConfig, http } from "wagmi";
import { baseSepolia, foundry } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { appConfig } from "./config";

// The app targets ONE chain (NEXT_PUBLIC_CHAIN_ID). List it first so wagmi's
// hooks default to it even before a wallet connects — otherwise read-only
// visitors resolve chain-reads against the wrong network's RPC.
const isFoundry = appConfig.chain.id === foundry.id;

export const wagmiConfig = createConfig({
  chains: isFoundry ? [foundry, baseSepolia] : [baseSepolia, foundry],
  connectors: [injected()],
  transports: {
    [foundry.id]: http(isFoundry ? appConfig.rpcUrl : undefined),
    [baseSepolia.id]: http(isFoundry ? undefined : appConfig.rpcUrl),
  },
  ssr: true,
});
