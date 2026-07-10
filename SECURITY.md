# Aegis Protocol — Threat Model & Security Notes

Status: pre-audit. This document records the threat model the system was
designed and tested against, plus known residual risks. It is written to be
read alongside the test suites, which encode each claim as an executable
check.

## Assets

| Asset | Where it lives | Loss scenario |
|---|---|---|
| Escrowed funds | `AegisEscrow` contract balance | Theft, double-payout, or permanent lock |
| Funder's sponsorship budget | Pimlico paymaster policy | Drained by non-participant UserOperations |
| Agent signing key | Turnkey/KMS (never on the relayer host) | Forged oracle attestations |
| Contributor's account | ERC-7579 Kernel (passkey-derived) | Account takeover → milestone payouts redirected |
| Evaluation integrity | Relayer pipeline | AI tricked into approving unfinished work |

## Trust model

**The AI oracle is fault-tolerant, not trusted.** It holds one vote of three,
custodies no funds, and is excluded from dispute resolution. The two human
parties acting together can always release, reject, or cancel regardless of
what the oracle does. Compromise of the agent key alone moves nothing —
*unless* a funder has installed the auto-approve policy module, which is an
explicit, capped, revocable delegation of their vote (see below).

## Adversaries & vectors

| # | Adversary | Vector | Mitigation | Verified by |
|---|---|---|---|---|
| 1 | Anyone with mempool access | Front-run `approveMilestone` | Permissionless-by-design: signatures authorize one exact effect; a front-runner only pays the gas | `Approve.t.sol::test_approve_isPermissionless` |
| 2 | Party replaying old signatures | Reuse across milestones, review rounds, escrows, or contract deployments | Digest binds `(escrowId, milestoneId, reviewNonce, commitHash, amount, recipient)` + EIP-712 domain (chainId, contract) | `Adversarial.t.sol::test_replay_*`, `Approve.t.sol::test_approve_revert_stale*` |
| 3 | Malicious contributor | Submit garbage, then resubmit after collecting stale approvals | `reviewNonce` bump invalidates every prior authorization | `Approve.t.sol`, `AutoApproveValidator.t.sol::…voidedWhenMilestoneLeavesInReview` |
| 4 | Malicious contributor | Prompt injection in the submitted code to sway the LLM | Untrusted-input fencing; `injectionSuspected` flag → escalate; deterministic gates are a floor the LLM cannot override; policy layer re-verifies everything before signing | relayer `prompt.test.ts`, `authorize.test.ts`, `pipeline.test.ts` |
| 5 | Malicious contributor wallet | ERC-1271 wallet approving everything / wrong magic value | Strict magic-value matching via OZ `SignatureChecker` | `Adversarial.t.sol::test_1271_wrongMagicValueRejected` |
| 6 | Compromised contributor account | Owner rotated after co-signature collected | 1271 validity checked at execution time, not issuance time | `Adversarial.t.sol::test_1271_ownerSwapInvalidatesCollectedSignature` |
| 7 | Malicious funding token | Reentrancy during payout | CEI ordering + transient-storage reentrancy guard (two independent defenses) | `Adversarial.t.sol::test_reentrantToken_cannotDoublePay` |
| 8 | Compromised relayer host | Exfiltrate the agent key / sign arbitrary payloads | Key lives in Turnkey/KMS, non-exportable, signing policy restricted to the AegisEscrow EIP-712 domain; key holds no ETH | Architecture (Phase 2.5 wiring); `signer.ts` docs |
| 9 | Anyone | Forged GitHub webhooks triggering evaluations | HMAC (X-Hub-Signature-256) verified timing-safe against raw bytes; on-chain event is the authoritative trigger, webhook is only an eager hint; reconcile step re-reads chain state | relayer `webhookVerify.test.ts`, `pipeline.test.ts` |
| 10 | Freeloaders | Drain the paymaster with non-Aegis UserOperations | Selector-scoped sponsorship: only participant actions on the escrow contract, no value transfers; enforced in the dashboard client and mirrored in the Pimlico server-side policy | web `sponsorship.test.ts` |
| 11 | Either human party | Signature-collection griefing (hold a mutual-cancel signature and execute it much later) | `CancelAuthorization` carries a `sigDeadline` | `Dispute.t.sol::test_cancelByMutualConsent_revert_expiredSignature` |
| 12 | Value-conservation bugs | Any action sequence that mints or destroys claim value | Invariant suite: exact solvency, obligation coverage, absorbing terminal states, randomized across all actions | `EscrowInvariant.t.sol` |
| 13 | Encoding drift between components | Off-chain signers hashing differently than the contract | Differential test (Solidity ↔ viem `hashTypedData`), typed-data parity test in web, digest cross-check in the relayer policy layer before every signature | `Eip712Differential.t.sol`, web `typedData.test.ts`, `authorize.ts` |

## The auto-approve module changes the trust math — deliberately

`AegisAutoApproveValidator` lets a funder's ERC-7579 account answer ERC-1271
for release digests that carry a valid oracle attestation, for registered
escrows, up to a per-release cap. Below the cap, **the oracle's attestation
effectively completes the 2-of-3 on its own** (its own signature + the
funder's programmatic vote). This is the feature — hands-off grant streaming —
but it means: within the cap, agent-key compromise = funds at risk. The module
therefore requires explicit opt-in per escrow, enforces the cap on-chain,
re-reads live escrow state on every check (dispute/resubmission voids it
instantly), and is revocable at any time (`setPolicy(escrow, 0)`). Tested in
`AutoApproveValidator.t.sol`.

## Known residual risks & accepted trade-offs

- **Fee-on-transfer / rebasing tokens are unsupported.** Funding pulls exact
  amounts; exotic token semantics would break solvency accounting. Use USDC
  or ETH.
- **ETH payouts to contract recipients that reject ETH revert the release**
  (`NativeTransferFailed`) rather than marking it paid; funds remain
  recoverable via dispute/mutual-cancel/expiry paths. Smart-account
  contributors accept ETH; this arises only with pathological recipients.
- **Kernel ERC-7739 signature wrapping** for the contributor 1271 path is
  validated against mocks locally; it must be re-verified against a deployed
  Kernel v3.1 on Base Sepolia before mainnet (Phase 4 checklist).
- **Post-deadline race:** after `deadline + disputeWindow`, a funder reclaim
  and a 2-of-3 release can race; the design intentionally gives the funder
  reclaim rights at that point. Parties should execute releases before the
  grace window closes.
- **Demo signature aggregation** in the dashboard uses localStorage; the
  production aggregation point is the relayer store. The contract verifies
  signatures regardless of the transport.

## Pre-mainnet checklist

- [ ] Slither + Aderyn static analysis pass on `packages/contracts/src`
- [ ] ModuleKit conformance run for `AegisAutoApproveValidator` against
      Kernel v3.1, Safe7579, and Nexus
- [ ] Base Sepolia staging rehearsal: real repo, real webhook, real Claude
      evaluation, Turnkey-signed release, sponsored UserOperations
- [ ] ERC-7739 contributor co-sign verified against deployed Kernel
- [ ] Independent audit of `AegisEscrow` + module
- [ ] Paymaster policy configured server-side (Pimlico dashboard) to mirror
      `lib/aa/sponsorship.ts`

## Reporting

This is a portfolio/institutional project; report issues via GitHub issues on
this repository.
