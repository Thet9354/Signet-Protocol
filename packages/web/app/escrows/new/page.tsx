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

  const inputCls =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-500";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Create escrow</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Funder flow — uses your connected wallet. Funds lock on creation; each milestone
          releases on 2-of-3 approval.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Parties</h2>
        <input className={inputCls} placeholder="Contributor smart-account address (0x…)" value={contributor} onChange={(e) => setContributor(e.target.value)} />
        <input className={inputCls} placeholder="AI agent signer address (0x…)" value={agentSigner} onChange={(e) => setAgentSigner(e.target.value)} />
        <input className={inputCls} placeholder="Funding token address — leave empty for ETH" value={token} onChange={(e) => setToken(e.target.value)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Repository commitment</h2>
        <div className="grid grid-cols-3 gap-3">
          <input className={`${inputCls} col-span-2`} placeholder="owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
          <input className={inputCls} placeholder="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-2 self-center text-xs text-zinc-500">
            Dispute grace window (days after each deadline before funds become reclaimable)
          </label>
          <input className={inputCls} type="number" min="0" value={disputeDays} onChange={(e) => setDisputeDays(e.target.value)} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Milestones</h2>
        {milestones.map((m, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Milestone {i}</p>
              {milestones.length > 1 && (
                <button className="text-xs text-red-400 hover:text-red-300" onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))}>
                  remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder={`Amount (${isNative ? "ETH" : "USDC"})`} value={m.amount} onChange={(e) => updateMilestone(i, { amount: e.target.value })} />
              <input className={inputCls} type="date" value={m.deadline} onChange={(e) => updateMilestone(i, { deadline: e.target.value })} />
            </div>
            <textarea
              className={`${inputCls} min-h-24 font-mono text-xs`}
              placeholder="Acceptance rubric (markdown) — its keccak256 hash is committed on-chain and the AI judges against exactly this document"
              value={m.rubric}
              onChange={(e) => updateMilestone(i, { rubric: e.target.value })}
            />
            {m.rubric && (
              <p className="break-all text-[10px] text-zinc-600">
                specHash: {keccak256(toBytes(m.rubric))}
              </p>
            )}
          </div>
        ))}
        <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900" onClick={() => setMilestones((ms) => [...ms, { ...EMPTY }])}>
          + Add milestone
        </button>
      </section>

      {error && <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

      <button
        onClick={() => void submit()}
        disabled={!isConnected || busy}
        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40"
      >
        {busy ? (status ?? "Working…") : isConnected ? "Create & fund escrow" : "Connect a wallet first"}
      </button>
    </div>
  );
}
