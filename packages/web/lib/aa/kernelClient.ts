/**
 * ERC-7579 smart account plumbing: ZeroDev Kernel v3.1 accounts assembled via
 * permissionless.js (vendor-neutral), bundled and sponsored through Pimlico.
 *
 * The account is counterfactual: the address exists the moment the passkey
 * does, and the deployment happens lazily inside the first UserOperation's
 * initCode — the user never sees a "deploy your wallet" step or a gas prompt.
 */
import { createSmartAccountClient, type SmartAccountClient } from "permissionless";
import { toKernelSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { http, type PublicClient } from "viem";
import { entryPoint07Address, type SmartAccount, type WebAuthnAccount } from "viem/account-abstraction";

import { appConfig, pimlicoRpcUrl } from "../config";
import { assertSponsorable, type Call } from "./sponsorship";

export async function createContributorAccount(
  client: PublicClient,
  owner: WebAuthnAccount,
): Promise<SmartAccount> {
  return toKernelSmartAccount({
    client,
    owners: [owner],
    version: "0.3.1",
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });
}

export function createGaslessClient(account: SmartAccount): SmartAccountClient {
  const url = pimlicoRpcUrl();
  const pimlico = createPimlicoClient({
    transport: http(url),
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });
  return createSmartAccountClient({
    account,
    chain: appConfig.chain,
    bundlerTransport: http(url),
    paymaster: pimlico,
    userOperation: {
      estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
    },
  });
}

/**
 * Sends a sponsored batch after checking the client-side sponsorship policy —
 * calls outside the policy are refused before they reach the paymaster.
 */
export async function sendSponsoredCalls(
  client: SmartAccountClient,
  calls: Call[],
): Promise<`0x${string}`> {
  assertSponsorable(calls, appConfig.escrowAddress);
  const hash = await client.sendUserOperation({ calls });
  const receipt = await client.waitForUserOperationReceipt({ hash });
  return receipt.receipt.transactionHash;
}
