/**
 * Passkey (WebAuthn P-256) credential management for the contributor persona.
 * The credential's public key deterministically derives the Kernel account
 * address, so "log in with your passkey" IS the wallet — no seed phrase, no
 * extension. On Base, WebAuthn verification uses the RIP-7212 precompile.
 */
"use client";

import {
  createWebAuthnCredential,
  toWebAuthnAccount,
  type P256Credential,
  type WebAuthnAccount,
} from "viem/account-abstraction";

const STORAGE_KEY = "aegis:passkey";

interface StoredCredential {
  id: string;
  publicKey: `0x${string}`;
}

export async function registerPasskey(name: string): Promise<P256Credential> {
  const credential = await createWebAuthnCredential({ name });
  const stored: StoredCredential = { id: credential.id, publicKey: credential.publicKey };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return credential;
}

export function loadPasskey(): P256Credential | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredCredential;
    return { id: stored.id, publicKey: stored.publicKey, raw: undefined as never };
  } catch {
    return null;
  }
}

export function clearPasskey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function passkeyOwner(credential: P256Credential): WebAuthnAccount {
  return toWebAuthnAccount({ credential });
}
