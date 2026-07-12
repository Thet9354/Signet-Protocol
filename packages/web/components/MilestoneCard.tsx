"use client";

import { useEffect, useState } from "react";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useSignTypedData, useWriteContract } from "wagmi";

import { aegisDomain, aegisTypes } from "@aegis/shared";
import { SignatureTracker } from "@/components/SignatureTracker";
import { StateBadge } from "@/components/StateBadge";
import { usePasskeyAccount } from "@/components/usePasskeyAccount";
import { createGaslessClient, sendSponsoredCalls } from "@/lib/aa/kernelClient";
import { appConfig } from "@/lib/config";
import { aegisEscrowAbi, formatAmount, MILESTONE_STATE_LABELS } from "@/lib/contracts/aegis";
import { addSignature, loadSignatures, type CollectedSignature } from "@/lib/sigStore";

interface MilestoneView {
  amount: bigint;
  deadline: number;
  reviewNonce: number;
  state: number;
  specHash: Hex;
  commitHash: Hex;
}

interface Props {
  escrowId: bigint;
  milestoneId: bigint;
  milestone: MilestoneView;
  funder: Address;
  contributor: Address;
  agentSigner: Address;
  token: Address;
  disputeWindow: number;
  onChanged: () => void;
}

const IN_REVIEW = 1;
const PENDING = 0;
const REJECTED = 4;
const APPROVED = 2;
const REFUNDED = 5;

export function MilestoneCard(props: Props) {
  const { escrowId, milestoneId, milestone } = props;
  const { address } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const passkey = usePasskeyAccount();

  const [digest, setDigest] = useState<Hex | null>(null);
  const [sigs, setSigs] = useState<CollectedSignature[]>([]);
  const [commitInput, setCommitInput] = useState("");
  const [artifactInput, setArtifactInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFunder = address?.toLowerCase() === props.funder.toLowerCase();
  const isContributorEoa = address?.toLowerCase() === props.contributor.toLowerCase();
  const isContributorPasskey = passkey.address?.toLowerCase() === props.contributor.toLowerCase();
  const stateLabel = MILESTONE_STATE_LABELS[milestone.state] ?? "?";

  // The on-chain digest for the CURRENT review round keys the signature set.
  useEffect(() => {
    if (milestone.state !== IN_REVIEW || !client) return;
    client
      .readContract({
        address: appConfig.escrowAddress,
        abi: aegisEscrowAbi,
        functionName: "hashReleaseAuthorization",
        args: [escrowId, milestoneId],
      })
      .then((d) => {
        setDigest(d);
        setSigs(loadSignatures(d));
      })
      .catch(() => setDigest(null));
  }, [milestone.state, milestone.reviewNonce, client, escrowId, milestoneId]);

  function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    fn()
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(null));
  }

  // ── Contributor: submit work (gasless via passkey account when available) ──
  const submit = () =>
    run("submit", async () => {
      const commitHash = commitInput.trim() as Hex;
      if (isContributorPasskey && passkey.account && appConfig.pimlicoApiKey) {
        const gasless = createGaslessClient(passkey.account);
        await sendSponsoredCalls(gasless, [
          {
            to: appConfig.escrowAddress,
            data: encodeFunctionData({
              abi: aegisEscrowAbi,
              functionName: "submitMilestone",
              args: [escrowId, milestoneId, commitHash, artifactInput.trim()],
            }),
          },
        ]);
      } else {
        const hash = await writeContractAsync({
          address: appConfig.escrowAddress,
          abi: aegisEscrowAbi,
          functionName: "submitMilestone",
          args: [escrowId, milestoneId, commitHash, artifactInput.trim()],
        });
        await client?.waitForTransactionReceipt({ hash });
      }
      props.onChanged();
    });

  // ── Co-sign: EIP-712 typed-data signature over the release payload ────────
  // Wallets can't sign raw digests; signTypedData over the canonical struct
  // produces a signature over exactly the digest the contract verifies.
  const typedData = {
    domain: aegisDomain(appConfig.chain.id, appConfig.escrowAddress),
    types: aegisTypes,
    primaryType: "ReleaseAuthorization" as const,
    message: {
      escrowId,
      milestoneId,
      reviewNonce: milestone.reviewNonce,
      commitHash: milestone.commitHash,
      amount: milestone.amount,
      recipient: props.contributor,
    },
  };

  const coSignFunder = () =>
    run("cosign", async () => {
      if (!digest || !address) return;
      const signature = await signTypedDataAsync(typedData);
      setSigs(addSignature(digest, { signer: address, signature, role: "funder" }));
    });

  const coSignContributor = () =>
    run("cosign", async () => {
      if (!digest || !passkey.account) return;
      // Kernel v3 wraps this via its WebAuthn validator so the escrow's
      // ERC-1271 check (SignatureChecker → isValidSignature) accepts it.
      const signature = await passkey.account.signTypedData(typedData);
      setSigs(addSignature(digest, { signer: props.contributor, signature, role: "contributor" }));
    });

  const pasteAgentSignature = (signature: string) => {
    if (!digest || !/^0x[0-9a-fA-F]{130}$/.test(signature.trim())) return;
    setSigs(
      addSignature(digest, {
        signer: props.agentSigner,
        signature: signature.trim() as Hex,
        role: "agent",
      }),
    );
  };

  // ── Execute: permissionless once any two signatures exist ─────────────────
  const execute = () =>
    run("execute", async () => {
      const two = sigs.slice(0, 2);
      const hash = await writeContractAsync({
        address: appConfig.escrowAddress,
        abi: aegisEscrowAbi,
        functionName: "approveMilestone",
        args: [escrowId, milestoneId, two.map((s) => s.signer), two.map((s) => s.signature)],
      });
      await client?.waitForTransactionReceipt({ hash });
      props.onChanged();
    });

  const raiseDispute = () =>
    run("dispute", async () => {
      const hash = await writeContractAsync({
        address: appConfig.escrowAddress,
        abi: aegisEscrowAbi,
        functionName: "raiseDispute",
        args: [escrowId, milestoneId],
      });
      await client?.waitForTransactionReceipt({ hash });
      props.onChanged();
    });

  const reclaim = () =>
    run("reclaim", async () => {
      const hash = await writeContractAsync({
        address: appConfig.escrowAddress,
        abi: aegisEscrowAbi,
        functionName: "reclaimExpired",
        args: [escrowId, milestoneId],
      });
      await client?.waitForTransactionReceipt({ hash });
      props.onChanged();
    });

  const canSubmit =
    (milestone.state === PENDING || milestone.state === REJECTED) &&
    (isContributorEoa || isContributorPasskey);
  const reclaimableAt = (milestone.deadline + props.disputeWindow) * 1000;
  const canReclaim =
    isFunder &&
    milestone.state !== APPROVED &&
    milestone.state !== REFUNDED &&
    Date.now() > reclaimableAt;

  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-display font-semibold">Milestone {milestoneId.toString()}</p>
          <p className="text-xs text-ink2">
            <span className="t-mono nums text-ink">{formatAmount(milestone.amount, props.token)}</span>
            <span className="mx-1.5 text-ink3">·</span>
            deadline {new Date(milestone.deadline * 1000).toLocaleDateString()}
            <span className="mx-1.5 text-ink3">·</span>
            review round {milestone.reviewNonce}
          </p>
        </div>
        <StateBadge label={stateLabel} />
      </div>

      {milestone.commitHash !==
        "0x0000000000000000000000000000000000000000000000000000000000000000" && (
        <p className="break-all text-[11px] text-ink3">
          commit under review: <span className="t-mono text-ink2">{milestone.commitHash}</span>
        </p>
      )}

      {canSubmit && (
        <div className="card-inset space-y-2.5 p-4">
          <p className="text-xs font-medium text-ink2">
            Submit work
            {isContributorPasskey && appConfig.pimlicoApiKey ? (
              <span className="ml-1.5 badge" style={{ color: "var(--color-moss)", borderColor: "color-mix(in oklab, var(--color-moss) 35%, transparent)" }}>
                gasless
              </span>
            ) : (
              <span className="ml-1 text-ink3"> · wallet transaction</span>
            )}
          </p>
          <input className="field t-mono" placeholder="Commit hash (0x… 32 bytes)" value={commitInput} onChange={(e) => setCommitInput(e.target.value)} />
          <input className="field t-mono" placeholder="Artifact URI (ipfs://…)" value={artifactInput} onChange={(e) => setArtifactInput(e.target.value)} />
          <button onClick={submit} disabled={busy !== null} className="btn btn-primary btn-sm">
            {busy === "submit" ? "Submitting…" : "Submit milestone"}
          </button>
        </div>
      )}

      {milestone.state === IN_REVIEW && digest && (
        <SignatureTracker
          digest={digest}
          funder={props.funder}
          contributor={props.contributor}
          agentSigner={props.agentSigner}
          signatures={sigs}
          onFunderSign={isFunder ? coSignFunder : undefined}
          onContributorSign={isContributorPasskey ? coSignContributor : undefined}
          onAgentPaste={pasteAgentSignature}
          onExecute={sigs.length >= 2 ? execute : undefined}
          busy={busy}
        />
      )}

      {((milestone.state === IN_REVIEW && (isFunder || isContributorEoa)) || canReclaim) && (
        <div className="flex gap-2">
          {milestone.state === IN_REVIEW && (isFunder || isContributorEoa) && (
            <button onClick={raiseDispute} disabled={busy !== null} className="btn btn-danger btn-sm">
              Raise dispute
            </button>
          )}
          {canReclaim && (
            <button
              onClick={reclaim}
              disabled={busy !== null}
              className="btn btn-sm"
              style={{ color: "var(--color-slate)", border: "1px solid color-mix(in oklab, var(--color-slate) 40%, transparent)" }}
            >
              Reclaim expired funds
            </button>
          )}
        </div>
      )}

      {error && (
        <p
          className="card-inset break-all p-3 text-xs"
          style={{ color: "var(--color-rust)", borderColor: "color-mix(in oklab, var(--color-rust) 40%, transparent)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
