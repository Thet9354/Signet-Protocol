// Seeds a local anvil chain for dashboard development:
// deploys TestUSDC + AegisEscrow, creates & funds a 2-milestone escrow,
// and submits milestone 0 so the review/co-sign UI has real state.
//
//   anvil &            (default port 8545)
//   node scripts/seed-local.mjs
//
// Deterministic addresses on a fresh anvil (funder = account #0):
//   TestUSDC    0x5FbDB2315678afecb367f032d93F642f64180aa3
//   AegisEscrow 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
import fs from "node:fs";
import { createPublicClient, createWalletClient, http, keccak256, toBytes, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

function artifact(rel) {
  return JSON.parse(fs.readFileSync(new URL(`../../contracts/out/${rel}`, import.meta.url), "utf8"));
}
const escrowArtifact = artifact("AegisEscrow.sol/AegisEscrow.json");
const usdcArtifact = artifact("TestUSDC.sol/TestUSDC.json");
const aegisEscrowAbi = escrowArtifact.abi;
const aegisEscrowBytecode = escrowArtifact.bytecode.object;
const testUsdcAbi = usdcArtifact.abi;
const testUsdcBytecode = usdcArtifact.bytecode.object;

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const funder = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const contributor = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const agent = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

const publicClient = createPublicClient({ chain: foundry, transport: http(RPC) });
const wallet = (account) => createWalletClient({ account, chain: foundry, transport: http(RPC) });

async function deploy(account, abi, bytecode, args = []) {
  const hash = await wallet(account).deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress;
}

async function write(account, request) {
  const hash = await wallet(account).writeContract(request);
  return publicClient.waitForTransactionReceipt({ hash });
}

const usdc = await deploy(funder, testUsdcAbi, testUsdcBytecode);
const escrow = await deploy(funder, aegisEscrowAbi, aegisEscrowBytecode);
console.log("TestUSDC   ", usdc);
console.log("AegisEscrow", escrow);

const rubric0 = "# Milestone 0: CLI MVP\n- Config parser implemented\n- Parser covered by tests\n";
const rubric1 = "# Milestone 1: API integration\n- REST client with retries\n- Integration test suite green\n";

const receipt = await write(funder, {
  address: escrow,
  abi: aegisEscrowAbi,
  functionName: "createEscrow",
  args: [
    contributor.address,
    agent.address,
    usdc,
    604_800, // 7-day grace window
    keccak256(toBytes("github:aegis-demo/cli:main")),
    [
      { amount: 1_000_000_000n, deadline: Math.floor(Date.now() / 1000) + 30 * 86_400, specHash: keccak256(toBytes(rubric0)) },
      { amount: 2_500_000_000n, deadline: Math.floor(Date.now() / 1000) + 60 * 86_400, specHash: keccak256(toBytes(rubric1)) },
    ],
  ],
});
const [created] = parseEventLogs({ abi: aegisEscrowAbi, eventName: "EscrowCreated", logs: receipt.logs });
const escrowId = created.args.escrowId;

await write(funder, { address: usdc, abi: testUsdcAbi, functionName: "approve", args: [escrow, 3_500_000_000n] });
await write(funder, { address: escrow, abi: aegisEscrowAbi, functionName: "fund", args: [escrowId] });
await write(contributor, {
  address: escrow,
  abi: aegisEscrowAbi,
  functionName: "submitMilestone",
  args: [escrowId, 0n, keccak256(toBytes("commit:seed-v1")), "ipfs://bafy-demo-artifact"],
});

console.log(`Escrow #${escrowId} funded; milestone 0 submitted and awaiting verification.`);
console.log(`Set NEXT_PUBLIC_ESCROW_ADDRESS=${escrow}`);
