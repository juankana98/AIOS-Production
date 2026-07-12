"use client";

import { useState, useTransition } from "react";
import { processIdea, applyIdeaProposal, discardIdea } from "@/actions/ideas";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, X } from "lucide-react";

export function IdeaActions({ ideaId, hasProposal }: { ideaId: string; hasProposal: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await processIdea(ideaId);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Error estructurando la idea");
              }
            })
          }
        >
          <Sparkles size={12} />
          {hasProposal ? "Re-estructurar con IA" : "Estructurar con IA"}
        </Button>
        {hasProposal && (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await applyIdeaProposal(ideaId);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Error aplicando la propuesta");
                }
              })
            }
          >
            <Check size={12} />
            Aplicar (crear proyecto/tareas)
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => startTransition(() => discardIdea(ideaId))}
        >
          <X size={12} />
          Descartar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
