"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { erc20Abi, keccak256, parseUnits, toBytes, parseEventLogs, type Address } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { appConfig } from "@/lib/config";
import { aegisEscrowAbi } from "@/lib/contracts/aegis";

interface MilestoneDraft {
  amount: string;
  deadline: string;
  rubric: string;
}

const EMPTY: MilestoneDraft = { amount: "", deadline: "", rubric: "" };

export default function NewEscrowPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [contributor, setContributor] = useState("");
  const [agentSigner, setAgentSigner] = useState("");
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [disputeDays, setDisputeDays] = useState("7");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([{ ...EMPTY }]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isNative = token.trim() === "";
  const decimals = isNative ? 18 : 6;

  function updateMilestone(i: number, patch: Partial<MilestoneDraft>) {
    setMilestones((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

  async function submit() {
    if (!client || !address) return;
    setBusy(true);
    setError(null);
    try {
      const tokenAddress = (isNative
        ? "0x0000000000000000000000000000000000000000"
        : token.trim()) as Address;
      const inputs = milestones.map((m) => ({
        amount: parseUnits(m.amount, decimals),
        deadline: Math.floor(new Date(m.deadline).getTime() / 1000),
        // Rubric is committed on-chain BEFORE work begins — the AI can only
        // ever judge against this exact document.
        specHash: keccak256(toBytes(m.rubric)),
      }));
      const total = inputs.reduce((acc, m) => acc + m.amount, 0n);

      // Persist rubric docs locally so the demo relayer can resolve them by hash.
      for (const m of milestones) {
        localStorage.setItem(`aegis:rubric:${keccak256(toBytes(m.rubric))}`, m.rubric);
      }

      setStatus("Creating escrow…");
      const createHash = await writeContractAsync({
        address: appConfig.escrowAddress,
        abi: aegisEscrowAbi,
        functionName: "createEscrow",
        args: [
          contributor.trim() as Address,
          agentSigner.trim() as Address,
          tokenAddress,
          Number(disputeDays) * 86_400,
          keccak256(toBytes(`github:${repo.trim()}:${branch.trim()}`)),
          inputs,
        ],
      });
      const receipt = await client.waitForTransactionReceipt({ hash: createHash });
      const [created] = parseEventLogs({
        abi: aegisEscrowAbi,
        eventName: "EscrowCreated",
        logs: receipt.logs,
      });
      const escrowId = created!.args.escrowId;

      if (!isNative) {
        setStatus("Approving token…");
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [appConfig.escrowAddress, total],
        });
        await client.waitForTransactionReceipt({ hash: approveHash });
      }

      setStatus("Funding…");
      const fundHash = await writeContractAsync({
        address: appConfig.escrowAddress,
        abi: aegisEscrowAbi,
        functionName: "fund",
        args: [escrowId],
        value: isNative ? total : 0n,
      });
      await client.waitForTransactionReceipt({ hash: fundHash });

      router.push(`/escrows/${escrowId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="space-y-3">
        <p className="t-label label-tick">Funder flow</p>
        <h1 className="t-h1">Create escrow</h1>
        <p className="t-lede text-base">
          Uses your connected wallet. Funds lock on creation; each milestone releases only on a
          2-of-3 seal.
        </p>
      </div>

      <section className="card space-y-3 p-6">
        <p className="t-label">Parties</p>
        <input className="field t-mono" placeholder="Contributor smart-account address (0x…)" value={contributor} onChange={(e) => setContributor(e.target.value)} />
        <input className="field t-mono" placeholder="AI agent signer address (0x…)" value={agentSigner} onChange={(e) => setAgentSigner(e.target.value)} />
        <input className="field t-mono" placeholder="Funding token address — leave empty for ETH" value={token} onChange={(e) => setToken(e.target.value)} />
      </section>

      <section className="card space-y-3 p-6">
        <p className="t-label">Repository commitment</p>
        <div className="grid grid-cols-3 gap-3">
          <input className="field col-span-2" placeholder="owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
          <input className="field" placeholder="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 items-center gap-3">
          <label className="col-span-2 text-xs text-ink2">
            Dispute grace window — days after each deadline before funds become reclaimable
          </label>
          <input className="field nums" type="number" min="0" value={disputeDays} onChange={(e) => setDisputeDays(e.target.value)} />
        </div>
      </section>

      <section className="space-y-4">
        <p className="t-label label-tick">Milestones</p>
        {milestones.map((m, i) => (
          <div key={i} className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold">Milestone {i}</p>
              {milestones.length > 1 && (
                <button className="text-xs transition-colors hover:opacity-80" style={{ color: "var(--color-rust)" }} onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="field nums" placeholder={`Amount (${isNative ? "ETH" : "USDC"})`} value={m.amount} onChange={(e) => updateMilestone(i, { amount: e.target.value })} />
              <input className="field" type="date" value={m.deadline} onChange={(e) => updateMilestone(i, { deadline: e.target.value })} />
            </div>
            <textarea
              className="field t-mono min-h-24 text-xs"
              placeholder="Acceptance rubric (markdown) — its keccak256 hash is committed on-chain and the AI judges against exactly this document"
              value={m.rubric}
              onChange={(e) => updateMilestone(i, { rubric: e.target.value })}
            />
            {m.rubric && (
              <p className="break-all text-[10px] text-ink3">
                <span className="text-brass">specHash</span> {keccak256(toBytes(m.rubric))}
              </p>
            )}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setMilestones((ms) => [...ms, { ...EMPTY }])}>
          + Add milestone
        </button>
      </section>

      {error && (
        <p
          className="card-inset break-words p-4 text-sm"
          style={{ color: "var(--color-rust)", borderColor: "color-mix(in oklab, var(--color-rust) 40%, transparent)" }}
        >
          {error}
        </p>
      )}

      <button onClick={() => void submit()} disabled={!isConnected || busy} className="btn btn-primary w-full">
        {busy ? (status ?? "Working…") : isConnected ? "Create & fund escrow" : "Connect a wallet first"}
      </button>
    </div>
  );
}
