// Differential-test oracle: computes the ReleaseAuthorization EIP-712 digest
// with viem, exactly as the relayer and frontend will. Invoked by
// test/differential/Eip712Differential.t.sol via vm.ffi.
//
// argv: chainId verifyingContract escrowId milestoneId reviewNonce commitHash amount recipient
import { hashTypedData } from "viem";

const [chainId, verifyingContract, escrowId, milestoneId, reviewNonce, commitHash, amount, recipient] =
  process.argv.slice(2);

const digest = hashTypedData({
  domain: {
    name: "AegisEscrow",
    version: "1",
    chainId: Number(chainId),
    verifyingContract,
  },
  types: {
    ReleaseAuthorization: [
      { name: "escrowId", type: "uint256" },
      { name: "milestoneId", type: "uint256" },
      { name: "reviewNonce", type: "uint40" },
      { name: "commitHash", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
  },
  primaryType: "ReleaseAuthorization",
  message: {
    escrowId: BigInt(escrowId),
    milestoneId: BigInt(milestoneId),
    reviewNonce: Number(reviewNonce),
    commitHash,
    amount: BigInt(amount),
    recipient,
  },
});

process.stdout.write(digest);
