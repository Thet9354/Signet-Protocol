import { MILESTONE_STATE_STYLES } from "@/lib/contracts/aegis";

export function StateBadge({ label }: { label: string }) {
  const style = MILESTONE_STATE_STYLES[label] ?? "bg-zinc-800 text-zinc-300";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>
  );
}
