/** Status pill, coloured from the design tokens. One mapping, reused everywhere. */

type Tone = "brass" | "moss" | "rust" | "slate" | "neutral";

const TONE: Record<string, { tone: Tone; pulse?: boolean }> = {
  // milestone states
  Pending: { tone: "neutral" },
  "In review": { tone: "brass", pulse: true },
  Approved: { tone: "moss" },
  Disputed: { tone: "rust" },
  Rejected: { tone: "rust" },
  Refunded: { tone: "slate" },
  // escrow states
  Created: { tone: "neutral" },
  Funded: { tone: "brass" },
  Completed: { tone: "moss" },
  Cancelled: { tone: "slate" },
};

const VARS: Record<Tone, string> = {
  brass: "var(--color-brass)",
  moss: "var(--color-moss)",
  rust: "var(--color-rust)",
  slate: "var(--color-slate)",
  neutral: "var(--color-ink2)",
};

export function StateBadge({ label }: { label: string }) {
  const { tone, pulse } = TONE[label] ?? { tone: "neutral" as Tone };
  const color = VARS[tone];
  return (
    <span
      className="badge"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      <span className={`badge-dot ${pulse ? "pulse-dot" : ""}`} />
      {label}
    </span>
  );
}
