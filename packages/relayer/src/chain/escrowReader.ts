import type { Address, Hex, PublicClient } from "viem";

import { aegisEscrowAbi } from "@aegis/shared/abi";
import type { EscrowOnChain, EscrowReader, MilestoneOnChain, VerificationTask } from "../types.js";

export class ViemEscrowReader implements EscrowReader {
  constructor(
    private readonly client: PublicClient,
    readonly address: Address,
    readonly chainId: number,
  ) {}

  async getEscrow(escrowId: bigint): Promise<EscrowOnChain> {
    const esc = await this.client.readContract({
      address: this.address,
      abi: aegisEscrowAbi,
      functionName: "getEscrow",
      args: [escrowId],
    });
    return {
      funder: esc.funder,
      contributor: esc.contributor,
      agentSigner: esc.agentSigner,
      token: esc.token,
      repoCommitment: esc.repoCommitment,
    };
  }

  async getMilestone(escrowId: bigint, milestoneId: bigint): Promise<MilestoneOnChain> {
    const ms = await this.client.readContract({
      address: this.address,
      abi: aegisEscrowAbi,
      functionName: "getMilestone",
      args: [escrowId, milestoneId],
    });
    return {
      amount: ms.amount,
      deadline: ms.deadline,
      reviewNonce: ms.reviewNonce,
      state: ms.state,
      specHash: ms.specHash,
      commitHash: ms.commitHash,
    };
  }

  async hashReleaseAuthorization(escrowId: bigint, milestoneId: bigint): Promise<Hex> {
    return this.client.readContract({
      address: this.address,
      abi: aegisEscrowAbi,
      functionName: "hashReleaseAuthorization",
      args: [escrowId, milestoneId],
    });
  }
}

/**
 * Watches MilestoneSubmitted events and enqueues verification tasks.
 * Local-dev trigger path; production adds the Ponder indexer as the
 * authoritative source with the GitHub webhook as an eager hint.
 */
export function watchMilestoneSubmitted(
  client: PublicClient,
  address: Address,
  onTask: (task: VerificationTask) => void,
): () => void {
  return client.watchContractEvent({
    address,
    abi: aegisEscrowAbi,
    eventName: "MilestoneSubmitted",
    onLogs: (logs) => {
      for (const log of logs) {
        const { escrowId, milestoneId, reviewNonce, commitHash, artifactURI } = log.args;
        if (escrowId === undefined || milestoneId === undefined || reviewNonce === undefined || !commitHash) {
          continue;
        }
        onTask({
          escrowId,
          milestoneId,
          reviewNonce,
          commitHash,
          artifactURI: artifactURI ?? "",
        });
      }
    },
  });
}
