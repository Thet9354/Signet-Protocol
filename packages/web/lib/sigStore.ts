/**
 * Local collection point for detached release signatures during a demo:
 * each party signs the digest on their own screen; once two of three are
 * present anyone can execute `approveMilestone`.
 *
 * Production replaces this with the relayer's Postgres store + API — the
 * contract doesn't care where signatures are aggregated, only that they
 * verify.
 */
"use client";

import type { Address, Hex } from "viem";

export interface CollectedSignature {
  signer: Address;
  signature: Hex;
  role: "funder" | "contributor" | "agent";
}

function key(digest: Hex): string {
  return `aegis:sigs:${digest.toLowerCase()}`;
}

export function loadSignatures(digest: Hex): CollectedSignature[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key(digest)) ?? "[]") as CollectedSignature[];
  } catch {
    return [];
  }
}

export function addSignature(digest: Hex, entry: CollectedSignature): CollectedSignature[] {
  const existing = loadSignatures(digest).filter(
    (s) => s.signer.toLowerCase() !== entry.signer.toLowerCase(),
  );
  const next = [...existing, entry];
  localStorage.setItem(key(digest), JSON.stringify(next));
  return next;
}
