"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StateBadge } from "@/components/StateBadge";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Escrows</h1>
        <Link
          href="/escrows/new"
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm hover:bg-violet-500"
        >
          New escrow
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          Could not reach the chain: {error}
        </p>
      )}
      {!rows && !error && <p className="text-sm text-zinc-500">Loading on-chain state…</p>}
      {rows?.length === 0 && (
        <p className="rounded-lg border border-zinc-800 p-6 text-sm text-zinc-500">
          No escrows yet on this chain.
        </p>
      )}

      <div className="grid gap-3">
        {rows?.map((row) => (
          <Link
            key={row.id.toString()}
            href={`/escrows/${row.id}`}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-600"
          >
            <div className="space-y-1">
              <p className="font-medium">Escrow #{row.id.toString()}</p>
              <p className="text-xs text-zinc-500">
                {shortAddress(row.funder)} → {shortAddress(row.contributor)} ·{" "}
                {row.milestones} milestone{row.milestones === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-300">{formatAmount(row.total, row.token)}</span>
              <StateBadge label={ESCROW_STATE_LABELS[row.state] ?? "?"} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
