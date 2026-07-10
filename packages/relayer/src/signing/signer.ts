/**
 * Agent-key signers.
 *
 * Production topology (Phase 4): a Turnkey-hosted key generated inside a TEE,
 * non-exportable, with a signing policy that only permits payloads matching
 * the AegisEscrow EIP-712 domain. The relayer holds an API credential, never
 * the key; even a fully compromised relayer host cannot make the key sign a
 * transaction, a token permit, or a foreign-domain message. The key holds no
 * ETH — it is a pure attestation key, 1 vote of 3.
 *
 * LocalDevSigner is for local development and integration tests only.
 */
import type { Address, Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

import type { ReleaseSigner } from "../types.js";

export class LocalDevSigner implements ReleaseSigner {
  private readonly account: PrivateKeyAccount;

  constructor(privateKey: Hex) {
    this.account = privateKeyToAccount(privateKey);
  }

  async address(): Promise<Address> {
    return this.account.address;
  }

  /** Signs the raw 32-byte digest (already an EIP-712 final hash). */
  async signDigest(digest: Hex): Promise<Hex> {
    return this.account.sign({ hash: digest });
  }
}
