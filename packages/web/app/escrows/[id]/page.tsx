"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MilestoneCard } from "@/components/MilestoneCard";
import { StateBadge } from "@/components/StateBadge";
import { DataPoint, Skeleton } from "@/components/ui";
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
      <div
        className="card-inset p-5 text-sm"
        style={{ borderColor: "color-mix(in oklab, var(--color-rust) 40%, transparent)" }}
      >
        <p className="mb-1 font-medium" style={{ color: "var(--color-rust)" }}>
          Couldn&apos;t load escrow #{escrowId.toString()}
        </p>
        <p className="break-words text-ink2">{error}</p>
      </div>
    );
  }
  if (!escrow) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const total = escrow.milestones.reduce((acc, m) => acc + m.amount, 0n);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/escrows" className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink2 transition-colors hover:text-ink">
          ← All escrows
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="t-h1">Escrow #{escrowId.toString()}</h1>
            <p className="t-lede text-base">
              <span className="t-mono nums text-ink">{formatAmount(total, escrow.token)}</span> across{" "}
              {escrow.milestones.length} milestone{escrow.milestones.length === 1 ? "" : "s"}
            </p>
          </div>
          <StateBadge label={ESCROW_STATE_LABELS[escrow.state] ?? "?"} />
        </div>
      </div>

      <div className="card grid gap-6 p-6 sm:grid-cols-3">
        <DataPoint label="Funder" value={shortAddress(escrow.funder)} title={escrow.funder} />
        <DataPoint
          label="Contributor · smart account"
          value={shortAddress(escrow.contributor)}
          title={escrow.contributor}
        />
        <DataPoint label="AI oracle signer" value={shortAddress(escrow.agentSigner)} title={escrow.agentSigner} />
      </div>

      <div className="space-y-4">
        <p className="t-label label-tick">Milestones</p>
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
