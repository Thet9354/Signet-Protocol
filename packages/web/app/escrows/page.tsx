"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Seal } from "@/components/Seal";
import { StateBadge } from "@/components/StateBadge";
import { Skeleton } from "@/components/ui";
import { appConfig } from "@/lib/config";
import {
  aegisEscrowAbi,
  ESCROW_STATE_LABELS,
  fetchEscrowIds,
  formatAmount,
  publicClient,
  shortAddress,
} from "@/lib/contracts/aegis";

interface EscrowRow {
  id: bigint;
  funder: string;
  contributor: string;
  token: `0x${string}`;
  state: number;
  total: bigint;
  milestones: number;
}

export default function EscrowsPage() {
  const [rows, setRows] = useState<EscrowRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = publicClient();
    (async () => {
      const ids = await fetchEscrowIds(client, appConfig.escrowAddress);
      const escrows = await Promise.all(
        ids.map(async (id) => {
          const esc = await client.readContract({
            address: appConfig.escrowAddress,
            abi: aegisEscrowAbi,
            functionName: "getEscrow",
            args: [id],
          });
          return {
            id,
            funder: esc.funder,
            contributor: esc.contributor,
            token: esc.token,
            state: esc.state,
            total: esc.milestones.reduce((acc, m) => acc + m.amount, 0n),
            milestones: esc.milestones.length,
          };
        }),
      );
      setRows(escrows);
    })().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <p className="t-label label-tick">On-chain · Base Sepolia</p>
          <h1 className="t-h1">Escrows</h1>
        </div>
        <Link href="/escrows/new" className="btn btn-primary">
          New escrow
        </Link>
      </div>

      {error && (
        <div
          className="card-inset p-5 text-sm"
          style={{ borderColor: "color-mix(in oklab, var(--color-rust) 40%, transparent)" }}
        >
          <p className="mb-1 font-medium" style={{ color: "var(--color-rust)" }}>
            Couldn&apos;t reach the chain
          </p>
          <p className="break-words text-ink2">{error}</p>
        </div>
      )}

      {/* loading skeletons */}
      {!rows && !error && (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card flex items-center justify-between p-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* empty state */}
      {rows?.length === 0 && (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <Seal size={40} />
          <div className="space-y-1">
            <p className="t-h2">No escrows yet</p>
            <p className="max-w-sm text-sm text-ink2">
              Create the first one — lock funding against a milestone schedule and let the 2-of-3
              seal handle release.
            </p>
          </div>
          <Link href="/escrows/new" className="btn btn-secondary btn-sm">
            Create an escrow
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {rows?.map((row, i) => (
          <Reveal key={row.id.toString()} delay={i * 60}>
            <Link href={`/escrows/${row.id}`} className="card card-link flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-line bg-canvas/50">
                  <Seal size={22} />
                </div>
                <div className="space-y-1">
                  <p className="font-display font-semibold">Escrow #{row.id.toString()}</p>
                  <p className="text-xs text-ink2">
                    <span className="t-mono">{shortAddress(row.funder)}</span>
                    <span className="mx-1.5 text-ink3">→</span>
                    <span className="t-mono">{shortAddress(row.contributor)}</span>
                    <span className="mx-1.5 text-ink3">·</span>
                    {row.milestones} milestone{row.milestones === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <span className="t-mono nums text-ink">{formatAmount(row.total, row.token)}</span>
                <StateBadge label={ESCROW_STATE_LABELS[row.state] ?? "?"} />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
