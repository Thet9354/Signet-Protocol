/** Tiny shared presentational primitives, all built from the design tokens. */
import type { ReactNode } from "react";

/** Uppercase section label with the brass hairline tick. */
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`t-label label-tick ${className}`}>{children}</p>;
}

/** Shimmering placeholder block for loading states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-[var(--radius-md)] ${className}`} />;
}

/** A labelled field with a monospace on-chain value (address, hash). */
export function DataPoint({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div className="min-w-0">
      <p className="t-label mb-1.5">{label}</p>
      <p className="t-mono truncate text-ink" title={title}>
        {value}
      </p>
    </div>
  );
}
