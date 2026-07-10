// Regenerates src/abi/aegisEscrow.ts from the Foundry build artifacts.
// Run after `forge build` in packages/contracts:  node scripts/sync-abi.mjs
import fs from "node:fs";

function loadArtifact(rel) {
  return JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), "utf8"));
}

const escrow = loadArtifact("../../contracts/out/AegisEscrow.sol/AegisEscrow.json");
const usdc = loadArtifact("../../contracts/out/TestUSDC.sol/TestUSDC.json");

const banner = "// Auto-generated from Foundry artifacts by scripts/sync-abi.mjs — do not edit.\n";

fs.mkdirSync(new URL("../src/abi/", import.meta.url), { recursive: true });
fs.writeFileSync(
  new URL("../src/abi/aegisEscrow.ts", import.meta.url),
  banner +
    `export const aegisEscrowAbi = ${JSON.stringify(escrow.abi, null, 2)} as const;\n\n` +
    `export const aegisEscrowBytecode = ${JSON.stringify(escrow.bytecode.object)} as const;\n\n` +
    `// Test-only token, used by local integration tests.\n` +
    `export const testUsdcAbi = ${JSON.stringify(usdc.abi, null, 2)} as const;\n\n` +
    `export const testUsdcBytecode = ${JSON.stringify(usdc.bytecode.object)} as const;\n`,
);

console.log("Wrote src/abi/aegisEscrow.ts");
