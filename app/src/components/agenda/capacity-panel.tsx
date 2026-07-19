import { Flame, Gauge } from "lucide-react";
import { formatMinutes } from "@/lib/utils";
import type { CapacityResult } from "@/lib/capacity";

const TONE = {
  low: {
    ring: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    msg: "Vas atrasado respecto a tu capacidad real de hoy.",
  },
  mid: {
    ring: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    msg: "Vas a mitad de camino — todavía puedes cerrar el día bien.",
  },
  high: {
    ring: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    msg: "Estás ejecutando a la altura de tu capacidad real de hoy.",
  },
} as const;

function toneFor(pct: number): keyof typeof TONE {
  if (pct >= 70) return "high";
  if (pct >= 35) return "mid";
  return "low";
}

export function CapacityPanel({ capacity, compact = false }: { capacity: CapacityResult; compact?: boolean }) {
  const tone = TONE[toneFor(capacity.performancePct)];

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Gauge size={14} />
          Capacidad de hoy
        </p>
        <span className={`text-2xl font-bold tabular-nums ${tone.ring}`}>{capacity.performancePct}%</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${tone.bar}`}
          style={{ width: `${Math.min(100, capacity.performancePct)}%` }}
        />
      </div>

      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {formatMinutes(capacity.availableMinutes)}
        </span>{" "}
        libres detectados
        {capacity.source === "google_calendar" ? " (Google Calendar)" : " (horario fijo — conecta Google Calendar)"} →{" "}
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {formatMinutes(capacity.executedMinutes)}
        </span>{" "}
        ejecutados
      </p>

      {!compact && (
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Flame size={12} className={tone.ring} />
          {tone.msg}
        </p>
      )}
    </div>
  );
}
