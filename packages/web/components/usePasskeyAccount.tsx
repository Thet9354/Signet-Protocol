"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import { createContributorAccount } from "@/lib/aa/kernelClient";
import { loadPasskey, passkeyOwner, registerPasskey } from "@/lib/aa/passkey";
import { publicClient } from "@/lib/contracts/aegis";

export interface PasskeyAccountState {
  address: Address | null;
  account: SmartAccount | null;
  busy: boolean;
  error: string | null;
  register: () => Promise<void>;
}

/**
 * Resolves the stored passkey credential into a counterfactual Kernel v3.1
 * account. The address is deterministic from the WebAuthn public key —
 * available immediately, deployed lazily on first UserOperation.
 */
export function usePasskeyAccount(): PasskeyAccountState {
  const [account, setAccount] = useState<SmartAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    const credential = loadPasskey();
    if (!credential) return;
    const smartAccount = await createContributorAccount(publicClient(), passkeyOwner(credential));
    setAccount(smartAccount);
  }, []);

  useEffect(() => {
    resolve().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [resolve]);

  const register = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await registerPasskey("Signet contributor");
      await resolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [resolve]);

  return { address: account?.address ?? null, account, busy, error, register };
}
