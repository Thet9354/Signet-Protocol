/**
 * The signet mark — a wax-seal ring with three nodes at 120°, two of them lit.
 * It literally draws the protocol: a 2-of-3 seal that authorizes a release.
 * Used as the logo and, faintly, as a page watermark.
 */
export function Seal({ size = 26, className = "" }: { size?: number; className?: string }) {
  const r = 15;
  const nodes = [-90, 30, 150].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: 20 + r * Math.cos(a), y: 20 + r * Math.sin(a) };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r={r} stroke="var(--color-line2)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r={r - 4} stroke="var(--color-line)" strokeWidth="1" />
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="3.1"
          fill={i < 2 ? "var(--color-brass)" : "var(--color-canvas)"}
          stroke={i < 2 ? "var(--color-brass2)" : "var(--color-line2)"}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
