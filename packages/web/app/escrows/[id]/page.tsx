"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MilestoneCard } from "@/components/MilestoneCard";
import { StateBadge } from "@/components/StateBadge";
import { appConfig } from "@/lib/config";
import {
  aegisEscrowAbi,
  ESCROW_STATE_LABELS,
  formatAmount,
  publicClient,
  shortAddress,
} from "@/lib/contracts/aegis";

type EscrowView = Awaited<
  ReturnType<ReturnType<typeof publicClient>["readContract"]>
> extends never
  ? never
  : {
      funder: `0x${string}`;
      contributor: `0x${string}`;
      agentSigner: `0x${string}`;
      token: `0x${string}`;
      disputeWindow: number;
      state: number;
      repoCommitment: `0x${string}`;
      milestones: readonly {
        amount: bigint;
        deadline: number;
        reviewNonce: number;
        state: number;
        specHash: `0x${string}`;
        commitHash: `0x${string}`;
      }[];
    };

export default function EscrowDetailPage() {
  const params = useParams<{ id: string }>();
  const escrowId = BigInt(params.id);
  const [escrow, setEscrow] = useState<EscrowView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const esc = await publicClient().readContract({
      address: appConfig.escrowAddress,
      abi: aegisEscrowAbi,
      functionName: "getEscrow",
      args: [escrowId],
    });
    setEscrow(esc as EscrowView);
  }, [escrowId]);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [refresh]);

  if (error) {
    return (
      <p className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
        Could not load escrow: {error}
      </p>
    );
  }
  if (!escrow) return <p className="text-sm text-zinc-500">Loading on-chain state…</p>;

  const total = escrow.milestones.reduce((acc, m) => acc + m.amount, 0n);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Escrow #{escrowId.toString()}</h1>
          <p className="text-sm text-zinc-500">
            {formatAmount(total, escrow.token)} across {escrow.milestones.length} milestone
            {escrow.milestones.length === 1 ? "" : "s"}
          </p>
        </div>
        <StateBadge label={ESCROW_STATE_LABELS[escrow.state] ?? "?"} />
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm md:grid-cols-3">
        {(
          [
            ["Funder", escrow.funder],
            ["Contributor (smart account)", escrow.contributor],
            ["AI oracle signer", escrow.agentSigner],
          ] as const
        ).map(([label, addr]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
            <p className="mt-1 font-mono text-xs" title={addr}>
              {shortAddress(addr)}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {escrow.milestones.map((milestone, i) => (
          <MilestoneCard
            key={i}
            escrowId={escrowId}
            milestoneId={BigInt(i)}
            milestone={milestone}
            funder={escrow.funder}
            contributor={escrow.contributor}
            agentSigner={escrow.agentSigner}
            token={escrow.token}
            disputeWindow={escrow.disputeWindow}
            onChanged={() => void refresh()}
          />
        ))}
      </div>
    </div>
  );
}
