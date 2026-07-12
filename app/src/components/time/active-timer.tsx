"use client";

import { useEffect, useState, useTransition } from "react";
import { Square } from "lucide-react";
import { stopTimer } from "@/actions/time-entries";
import { Button } from "@/components/ui/button";
import { formatSeconds } from "@/lib/utils";

export function ActiveTimer({
  entryId,
  taskId,
  taskTitle,
  startedAt,
}: {
  entryId: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
}) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Trabajando en
        </p>
        <p className="text-sm font-semibold">{taskTitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-lg tabular-nums">{formatSeconds(elapsed)}</span>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => stopTimer(entryId, taskId))}
        >
          <Square size={12} />
          Detener
        </Button>
      </div>
    </div>
  );
}
