import Link from "next/link";

const PILLARS = [
  {
    title: "2-of-3 release",
    body: "Funder, contributor, and an AI oracle each hold one vote. Any two signatures over the EIP-712 release payload move the funds — the AI is fault-tolerant, never trusted.",
  },
  {
    title: "AI-verified milestones",
    body: "Submissions are judged against a rubric committed on-chain before work began: sandboxed tests, coverage and provenance gates, then a structured Claude evaluation.",
  },
  {
    title: "Wallet-free UX",
    body: "Contributors sign in with a passkey. The ERC-7579 smart account deploys itself inside the first sponsored UserOperation — no seed phrase, no gas, no extension.",
  },
] as const;

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="space-y-5 pt-8">
        <p className="text-xs uppercase tracking-[0.3em] text-violet-400">Aegis Protocol</p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight">
          Milestone escrow where an autonomous AI agent co-signs the release.
        </h1>
        <p className="max-w-xl text-zinc-400">
          Lock funding against a milestone schedule. Releases require two of three
          cryptographic approvals — the funder, the contributor&apos;s smart account, and an
          AI oracle that verifies the code actually ships.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            href="/escrows/new"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500"
          >
            Create an escrow
          </Link>
          <Link
            href="/escrows"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            View escrows
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="mb-2 font-medium">{p.title}</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{p.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
