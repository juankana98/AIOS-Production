import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  size = "md",
  showLabel = true,
}: {
  value: number;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    pct >= 70
      ? "bg-gradient-to-r from-teal-500 to-emerald-500"
      : pct >= 35
        ? "bg-gradient-to-r from-amber-400 to-amber-500"
        : "bg-gradient-to-r from-red-400 to-red-500";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-slate-600 dark:text-teal-100/60">
          {pct}%
        </span>
      )}
    </div>
  );
}
