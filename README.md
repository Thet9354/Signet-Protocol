# Aegis Protocol

**Autonomous AI-Agent × ERC-7579 Modular Account Abstraction Milestone Escrow.**

Funders (university clubs, VCs, hackathon organizers) lock funding against a milestone
schedule. Releases require **2-of-3 EIP-712 authorization** among:

1. the **funder**,
2. the **contributor** (an ERC-7579 smart account — passkey login, gasless UX), and
3. an **AI oracle** — an autonomous agent that clones the submitted git commit, runs
   deterministic gates (tests, coverage, provenance) plus an LLM rubric evaluation, and
   co-signs the release payload with a KMS-isolated key.

> **Trust model: the AI is fault-tolerant, not trusted.** It holds one vote of three,
> custodies no funds, and has no say in dispute resolution — the two human parties
> acting together always override it.

## Security properties (enforced by the contract, verified by the test suite)

- **Replay-proof authorizations** — every signature is bound to
  `(escrowId, milestoneId, reviewNonce, commitHash, amount, recipient)` and
  domain-separated by `(chainId, verifyingContract)`. Resubmission bumps `reviewNonce`,
  invalidating all previously issued signatures.
- **Permissionless, griefing-neutral execution** — `approveMilestone` derives validity
  from signatures, not `msg.sender`; a front-runner can only cause the authorized payout.
- **Exact solvency** — invariant-tested: escrow balance always equals funded − paid −
  refunded, and always covers outstanding obligations.
- **Absorbing terminal states** — an `Approved` or `Refunded` milestone can never
  transition again (payment idempotence).
- **ERC-1271 aware** — the contributor signs through their smart account, not an EOA.

## Repository layout

```
packages/
├── contracts/   Foundry — AegisEscrow, unit + fuzz + invariant + differential tests
├── shared/      Canonical EIP-712 domain/types + generated ABI, shared by relayer & frontend
├── relayer/     AI oracle: reconcile → acquire → gates → LLM verdict → policy → sign
└── web/         Next.js dashboard: passkey smart accounts, gasless flows, co-sign UI
```

## The oracle pipeline (packages/relayer)

Verification runs as five idempotent steps per `(escrow, milestone, reviewNonce)`:

1. **Reconcile** — re-read on-chain state; skip stale or resubmitted tasks.
2. **Rubric integrity** — the acceptance rubric must hash to the on-chain
   `specHash`, so the AI judges against the document both parties committed to
   before work began.
3. **Deterministic gates** — tests, coverage, diff size, commit provenance,
   lockfile integrity. Gates are a *floor the LLM cannot override*: a failed
   gate rejects without ever calling the model.
4. **LLM evaluation** — Claude with structured outputs; the verdict enters the
   system only as a schema-validated object. Contributor code is fenced as
   untrusted input, and suspected prompt injection escalates to human review.
5. **Policy + signature** — a separate signing layer re-verifies every claim
   against chain state, cross-checks the locally computed EIP-712 digest
   against the contract's own `hashReleaseAuthorization`, and only then
   requests a detached signature from the agent key (Turnkey/KMS in
   production, policy-restricted to this contract's EIP-712 domain).

The end-to-end test (`packages/relayer/test/e2e`) drives the whole loop
against anvil: create → fund → submit → pipeline signature → funder co-sign →
permissionless `approveMilestone` → on-chain payout.

## The dashboard (packages/web)

Next.js 15 (App Router) + Tailwind v4 + wagmi/viem, with two personas:

- **Funder** — injected EOA/Safe via wagmi: escrow creation wizard (rubric is
  hashed to the on-chain `specHash` as you type), funding, co-signing,
  disputes, expiry reclaim.
- **Contributor** — passkey sign-in: the WebAuthn credential deterministically
  derives a counterfactual **ZeroDev Kernel v3.1** account (assembled through
  `permissionless.js`, so no vendor lock-in), deployed lazily inside the first
  **Pimlico-sponsored** UserOperation. Sponsorship is selector-scoped —
  `lib/aa/sponsorship.ts` allowlists only participant actions on the escrow
  contract, and the unit tests cover the paymaster-drain vectors.

Co-signing uses **EIP-712 `signTypedData`** (wallets cannot sign raw digests);
a test locks the UI's typed-data payload to the canonical digest in
`@aegis/shared`, the same digest the contract computes and the relayer's KMS
signs. The signature tracker shows 2-of-3 progress per review round and lets
anyone execute the release once two signatures exist.

Local demo:

```bash
anvil &
node packages/web/scripts/seed-local.mjs   # deploy + create + fund + submit
cp packages/web/.env.example packages/web/.env.local
pnpm --dir packages/web dev
```

## Development

```bash
pnpm install                      # JS deps (viem, used by the differential test)
cd packages/contracts
forge build
forge test                        # unit + fuzz + invariant + EIP-712 differential
```

The differential suite (`test/differential/`) shells out via `ffi` to viem's
`hashTypedData` and asserts byte-equality with the Solidity digest — guaranteeing that
what the relayer asks its KMS to sign and what the frontend asks a passkey to sign is
exactly what the contract verifies.

## Status

- [x] Phase 1 — escrow contract, state machines, 2-of-3 verification, dispute/expiry
      paths, unit + invariant + differential tests
- [x] Phase 2 — AI oracle relayer: verification pipeline, deterministic gates,
      Claude structured-output evaluation, signing policy layer, GitHub webhook/App
      auth, anvil end-to-end release flow
- [x] Phase 3 — Next.js dashboard: passkey Kernel accounts (permissionless.js),
      selector-scoped Pimlico sponsorship, escrow wizard, 2-of-3 co-sign flow
- [x] Phase 4 — adversarial test matrix (replay, 1271 edge cases, reentrancy),
      `AegisAutoApproveValidator` ERC-7579 policy module, [SECURITY.md](SECURITY.md)
      threat model, gas snapshot
- [ ] Pre-mainnet — see the checklist in [SECURITY.md](SECURITY.md): Base Sepolia
      staging rehearsal, Turnkey/Ponder/Inngest production hosting, ModuleKit
      conformance, static analysis, independent audit

## The ERC-7579 policy module

[`AegisAutoApproveValidator`](packages/contracts/src/modules/AegisAutoApproveValidator.sol)
is an ERC-7579 validator a funder installs on their smart account: for
registered escrows, the account's ERC-1271 check accepts a release digest that
carries a valid AI-oracle attestation, provided the milestone amount is under
a per-release cap. Below the cap, the funder's 2-of-3 vote is cast
programmatically the moment the AI approves — hands-off grant streaming as an
installable, capped, revocable account policy. The trust-math implications are
documented explicitly in [SECURITY.md](SECURITY.md).
- [ ] Phase 3 — web app, ERC-7579 accounts, paymaster-sponsored flows
- [ ] Phase 4 — integration, adversarial testing, audit pass
