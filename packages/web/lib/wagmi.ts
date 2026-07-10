import { createConfig, http } from "wagmi";
import { baseSepolia, foundry } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { appConfig } from "./config";

export const wagmiConfig = createConfig({
  chains: [foundry, baseSepolia],
  connectors: [injected()],
  transports: {
    [foundry.id]: http(appConfig.chain.id === foundry.id ? appConfig.rpcUrl : undefined),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
