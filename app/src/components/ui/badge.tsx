import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "slate" | "emerald" | "amber" | "red" | "teal";

const toneClasses: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-400/10 dark:text-teal-300",
};

export function Badge({
  className,
  tone = "slate",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
