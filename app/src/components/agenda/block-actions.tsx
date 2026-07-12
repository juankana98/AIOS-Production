"use client";

import { useTransition } from "react";
import { updateBlockStatus, deleteBlock } from "@/actions/schedule";
import { Check, X, Trash2 } from "lucide-react";

export function BlockActions({ blockId }: { blockId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <button
        title="Marcar hecho"
        disabled={isPending}
        onClick={() => startTransition(() => updateBlockStatus(blockId, "done"))}
        className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
      >
        <Check size={14} />
      </button>
      <button
        title="Saltar"
        disabled={isPending}
        onClick={() => startTransition(() => updateBlockStatus(blockId, "skipped"))}
        className="rounded p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
      >
        <X size={14} />
      </button>
      <button
        title="Eliminar"
        disabled={isPending}
        onClick={() => startTransition(() => deleteBlock(blockId))}
        className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
