import Link from "next/link";

import { Reveal } from "@/components/Reveal";
import { Seal } from "@/components/Seal";
import { SectionLabel } from "@/components/ui";

const PILLARS = [
  {
    k: "01",
    title: "2-of-3 seal",
    body: "Funder, contributor, and an AI oracle each hold one key. Any two signatures over the EIP-712 release payload move the funds — the AI is fault-tolerant, never trusted.",
  },
  {
    k: "02",
    title: "AI-verified milestones",
    body: "Submissions are judged against a rubric committed on-chain before work began: sandboxed tests, coverage, and provenance gates, then a structured Claude evaluation.",
  },
  {
    k: "03",
    title: "Wallet-free UX",
    body: "Contributors sign in with a passkey. The ERC-7579 smart account deploys itself inside the first sponsored UserOperation — no seed phrase, no gas, no extension.",
  },
] as const;

const LIFECYCLE = [
  ["Fund", "Lock USDC against a milestone schedule"],
  ["Submit", "Contributor ships a commit for review"],
  ["Verify", "AI oracle checks the code, co-signs"],
  ["Release", "Two seals pay the contributor out"],
] as const;

export default function Home() {
  return (
    <div className="space-y-28">
      {/* ── hero ── */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <Reveal className="space-y-6">
          <SectionLabel>Signet Protocol</SectionLabel>
          <h1 className="t-display max-w-xl text-balance">
            Milestone escrow, sealed by an autonomous AI agent.
          </h1>
          <p className="t-lede max-w-lg">
            Lock funding against a milestone schedule. Every release takes two of three
            cryptographic seals — the funder, the contributor&apos;s smart account, and an AI
            oracle that verifies the code actually shipped.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/escrows/new" className="btn btn-primary">
              Create an escrow
            </Link>
            <Link href="/escrows" className="btn btn-ghost">
              View live escrows
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <AuthPreview />
        </Reveal>
      </section>

      {/* ── pillars ── */}
      <section className="space-y-8">
        <Reveal>
          <SectionLabel>Why it holds</SectionLabel>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.k} delay={i * 90}>
              <article className="card card-link h-full p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="t-mono text-ink3">{p.k}</span>
                  <Seal size={20} />
                </div>
                <h2 className="t-h2 mb-2">{p.title}</h2>
                <p className="text-sm leading-relaxed text-ink2">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── lifecycle ── */}
      <section className="space-y-8">
        <Reveal>
          <SectionLabel>The lifecycle</SectionLabel>
        </Reveal>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {LIFECYCLE.map(([step, desc], i) => (
            <Reveal key={step} delay={i * 80} className="bg-card p-6">
              <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full border border-line2 text-xs font-semibold text-brass">
                {i + 1}
              </div>
              <p className="t-h2 mb-1 text-base">{step}</p>
              <p className="text-sm leading-relaxed text-ink2">{desc}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

/** A static preview of the release-authorization card — the product, at a glance. */
function AuthPreview() {
  const rows = [
    { label: "Funder", signed: true },
    { label: "AI oracle", signed: true },
    { label: "Contributor", signed: false },
  ];
  return (
    <div className="card p-6 shadow-[var(--shadow-pop)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Seal size={22} />
          <span className="t-h2 text-base">Release authorization</span>
        </div>
        <span className="badge" style={{ color: "var(--color-brass)", borderColor: "color-mix(in oklab, var(--color-brass) 35%, transparent)" }}>
          <span className="badge-dot pulse-dot" />
          2 of 3
        </span>
      </div>

      <div className="space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-canvas/40 px-3.5 py-2.5"
          >
            <span className="text-sm text-ink2">{r.label}</span>
            {r.signed ? (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-moss)" }}>
                <CheckIcon /> sealed
              </span>
            ) : (
              <span className="t-mono text-ink3">awaiting</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="t-mono text-ink3">1,000 USDC</span>
        <span className="text-sm font-medium" style={{ color: "var(--color-moss)" }}>
          Executable →
        </span>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
