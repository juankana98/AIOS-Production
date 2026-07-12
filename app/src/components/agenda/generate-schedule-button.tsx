"use client";

import { useState, useTransition } from "react";
import { generateScheduleForDay } from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function GenerateScheduleButton({ dateISO }: { dateISO: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await generateScheduleForDay(dateISO);
            setResult(`${res.scheduled} tareas agendadas${res.skipped > 0 ? `, ${res.skipped} no cupieron hoy` : ""}`);
          })
        }
      >
        <Sparkles size={14} />
        {isPending ? "Generando..." : "Generar agenda del día"}
      </Button>
      {result && <span className="text-xs text-slate-500">{result}</span>}
    </div>
  );
}
