"use client";

import { useState } from "react";
import type { Address, Hex } from "viem";

import { shortAddress } from "@/lib/contracts/aegis";
import type { CollectedSignature } from "@/lib/sigStore";

interface Props {
  digest: Hex;
  funder: Address;
  contributor: Address;
  agentSigner: Address;
  signatures: CollectedSignature[];
  onFunderSign?: () => void;
  onContributorSign?: () => void;
  onAgentPaste?: (signature: string) => void;
  onExecute?: () => void;
  busy: string | null;
}

/** 2-of-3 release progress: who has signed the current review round's digest. */
export function SignatureTracker(props: Props) {
  const [agentSig, setAgentSig] = useState("");
  const has = (addr: Address) =>
    props.signatures.some((s) => s.signer.toLowerCase() === addr.toLowerCase());

  const rows = [
    { label: "Funder", addr: props.funder, action: props.onFunderSign },
    { label: "Contributor", addr: props.contributor, action: props.onContributorSign },
    { label: "AI oracle", addr: props.agentSigner, action: undefined },
  ] as const;

  const count = rows.filter((r) => has(r.addr)).length;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400">
          Release authorization — {count} of 3 collected{" "}
          {count >= 2 && <span className="text-emerald-400">(executable)</span>}
        </p>
        <p className="font-mono text-[10px] text-zinc-600" title={props.digest}>
          digest {props.digest.slice(0, 10)}…
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              {row.label} <span className="font-mono text-zinc-600">{shortAddress(row.addr)}</span>
            </span>
            {has(row.addr) ? (
              <span className="text-emerald-400">✓ signed</span>
            ) : row.action ? (
              <button
                onClick={row.action}
                disabled={props.busy !== null}
                className="rounded border border-violet-800 px-2 py-0.5 text-violet-300 hover:bg-violet-950 disabled:opacity-40"
              >
                {props.busy === "cosign" ? "…" : "Co-sign"}
              </button>
            ) : (
              <span className="text-zinc-600">
                {row.label === "AI oracle" ? "issued by the relayer on verification" : "awaiting"}
              </span>
            )}
          </div>
        ))}
      </div>

      {props.onAgentPaste && !has(props.agentSigner) && (
        <div className="flex gap-2">
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px] outline-none focus:border-violet-500"
            placeholder="Paste oracle signature (0x…, 65 bytes) from the relayer record"
            value={agentSig}
            onChange={(e) => setAgentSig(e.target.value)}
          />
          <button
            onClick={() => {
              props.onAgentPaste?.(agentSig);
              setAgentSig("");
            }}
            className="rounded border border-zinc-700 px-2 text-xs hover:bg-zinc-800"
          >
            Add
          </button>
        </div>
      )}

      {props.onExecute && (
        <button
          onClick={props.onExecute}
          disabled={props.busy !== null}
          className="w-full rounded-lg bg-emerald-700 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-40"
        >
          {props.busy === "execute" ? "Executing…" : "Execute release (permissionless)"}
        </button>
      )}
    </div>
  );
}
