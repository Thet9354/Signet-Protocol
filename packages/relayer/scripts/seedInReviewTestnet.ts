/**
 * Seeds a fresh escrow on Base Sepolia and leaves milestone 0 IN REVIEW, so the
 * dashboard displays its 2-of-3 signature tracker with real on-chain data
 * (useful for demos / portfolio screenshots). Does NOT release.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  parseEventLogs,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { aegisEscrowAbi, testUsdcAbi } from "@aegis/shared/abi";

const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const ESCROW = (process.env.ESCROW_ADDRESS ?? "") as Address;
const USDC = (process.env.USDC_ADDRESS ?? "") as Address;
const FUNDER_KEY = (process.env.FUNDER_PRIVATE_KEY ?? "") as Hex;
const AGENT = (process.env.AGENT_ADDRESS ?? "0x0909e18cf4879D0790ac7651564C5D77CDB0060A") as Address;
const AMOUNT = 2_500_000_000n; // 2,500 TestUSDC

const funder = privateKeyToAccount(FUNDER_KEY);
const contributor = privateKeyToAccount(generatePrivateKey());
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
const funderWallet = createWalletClient({ account: funder, chain: baseSepolia, transport: http(RPC_URL) });
const contributorWallet = createWalletClient({ account: contributor, chain: baseSepolia, transport: http(RPC_URL) });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function wait(hash: Hex, label: string) {
  const r = await pub.waitForTransactionReceipt({ hash, confirmations: 2 });
  console.log(`   ${label}: ${r.status}`);
  if (r.status !== "success") throw new Error(`${label} reverted`);
  return r;
}
async function waitRetry(send: () => Promise<Hex>, label: string, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await wait(await send(), label);
    } catch (e) {
      if (i === attempts) throw e;
      console.log(`   ${label}: retry ${i} (RPC lag)…`);
      await sleep(4000);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const rubric = "# Milestone 0: API integration\n- REST client with retries\n- Integration suite green\n";
  console.log(`Seeding in-review escrow · funder ${funder.address} · contributor ${contributor.address}`);

  await wait(await funderWallet.sendTransaction({ to: contributor.address, value: parseEther("0.0004") }), "gas");
  const created = await waitRetry(
    () => funderWallet.writeContract({
      address: ESCROW,
      abi: aegisEscrowAbi,
      functionName: "createEscrow",
      args: [
        contributor.address,
        AGENT,
        USDC,
        604_800,
        keccak256(toBytes("github:aegis-demo/api-client:main")),
        [{ amount: AMOUNT, deadline: Math.floor(Date.now() / 1000) + 45 * 86_400, specHash: keccak256(toBytes(rubric)) }],
      ],
    }),
    "createEscrow",
  );
  const escrowId = parseEventLogs({ abi: aegisEscrowAbi, eventName: "EscrowCreated", logs: created.logs })[0]!.args.escrowId;

  await waitRetry(() => funderWallet.writeContract({ address: USDC, abi: testUsdcAbi, functionName: "approve", args: [ESCROW, AMOUNT] }), "approve");
  await waitRetry(() => funderWallet.writeContract({ address: ESCROW, abi: aegisEscrowAbi, functionName: "fund", args: [escrowId] }), "fund");
  await waitRetry(
    () => contributorWallet.writeContract({
      address: ESCROW,
      abi: aegisEscrowAbi,
      functionName: "submitMilestone",
      args: [escrowId, 0n, keccak256(toBytes("commit:api-client-v1")), "ipfs://bafy-demo-artifact"],
    }),
    "submitMilestone",
  );

  console.log(`\n✓ Escrow #${escrowId} seeded, milestone 0 InReview (awaiting 2-of-3 signatures).`);
  console.log(`  View at http://localhost:3000/escrows/${escrowId}`);
}

void main().catch((e) => {
  console.error("failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
