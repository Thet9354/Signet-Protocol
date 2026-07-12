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

  const executable = count >= 2;

  return (
    <div className="card-inset space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="t-h2 text-sm">Release authorization</span>
          <span
            className="badge"
            style={{
              color: executable ? "var(--color-moss)" : "var(--color-brass)",
              borderColor: `color-mix(in oklab, ${executable ? "var(--color-moss)" : "var(--color-brass)"} 35%, transparent)`,
            }}
          >
            <span className={`badge-dot ${executable ? "" : "pulse-dot"}`} />
            {count} of 3{executable ? " · executable" : ""}
          </span>
        </div>
        <p className="t-mono text-[10px] text-ink3" title={props.digest}>
          {props.digest.slice(0, 12)}…
        </p>
      </div>

      {/* progress rail */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < count ? "var(--color-brass)" : "var(--color-line2)" }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const signed = has(row.addr);
          return (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-canvas/40 px-3.5 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm text-ink2">
                {row.label}
                <span className="t-mono text-ink3">{shortAddress(row.addr)}</span>
              </span>
              {signed ? (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-moss)" }}>
                  <CheckIcon /> sealed
                </span>
              ) : row.action ? (
                <button onClick={row.action} disabled={props.busy !== null} className="btn btn-secondary btn-sm">
                  {props.busy === "cosign" ? "…" : "Co-sign"}
                </button>
              ) : (
                <span className="text-xs text-ink3">
                  {row.label === "AI oracle" ? "issued by the relayer" : "awaiting"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {props.onAgentPaste && !has(props.agentSigner) && (
        <div className="flex gap-2">
          <input
            className="field t-mono text-[11px]"
            placeholder="Paste oracle signature (0x…) from the relayer record"
            value={agentSig}
            onChange={(e) => setAgentSig(e.target.value)}
          />
          <button
            onClick={() => {
              props.onAgentPaste?.(agentSig);
              setAgentSig("");
            }}
            className="btn btn-secondary btn-sm"
          >
            Add
          </button>
        </div>
      )}

      {props.onExecute && (
        <button onClick={props.onExecute} disabled={props.busy !== null} className="btn btn-success w-full">
          {props.busy === "execute" ? "Executing…" : "Execute release · permissionless"}
        </button>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
