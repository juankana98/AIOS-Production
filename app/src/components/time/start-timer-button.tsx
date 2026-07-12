"use client";

import { useTransition } from "react";
import { Play } from "lucide-react";
import { startTimer } from "@/actions/time-entries";
import { Button } from "@/components/ui/button";

export function StartTimerButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(() => startTimer(taskId));
      }}
    >
      <Play size={12} />
      Iniciar
    </Button>
  );
}
