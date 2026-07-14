"use client";

import { useState, useTransition } from "react";
import { processIdea, refineIdeaProposal, applyIdeaProposal, discardIdea } from "@/actions/ideas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { REASONING_TIERS, DEFAULT_TIER, type ReasoningTier } from "@/lib/ai/models";
import { Sparkles, Check, X, MessageSquarePlus, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_ORDER: ReasoningTier[] = ["low", "medium", "high"];

function TierSelector({ value, onChange }: { value: ReasoningTier; onChange: (t: ReasoningTier) => void }) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
        <BrainCircuit size={12} />
        Nivel de razonamiento
      </p>
      <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs dark:border-slate-700 dark:bg-slate-900">
        {TIER_ORDER.map((tier) => (
          <button
            key={tier}
            type="button"
            title={REASONING_TIERS[tier].description}
            onClick={() => onChange(tier)}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors",
              value === tier
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}
          >
            {REASONING_TIERS[tier].label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function IdeaActions({ ideaId, hasProposal }: { ideaId: string; hasProposal: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [tier, setTier] = useState<ReasoningTier>(DEFAULT_TIER);

  function handleStructure() {
    startTransition(async () => {
      setError(null);
      try {
        await processIdea(ideaId, tier);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error estructurando la idea");
      }
    });
  }

  function handleRefine() {
    if (!feedback.trim()) return;
    startTransition(async () => {
      setError(null);
      try {
        await refineIdeaProposal(ideaId, feedback, tier);
        setFeedback("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error ajustando la propuesta");
      }
    });
  }

  return (
    <div className="space-y-3">
      <TierSelector value={tier} onChange={setTier} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={handleStructure}>
          <Sparkles size={12} />
          {hasProposal ? "Empezar de cero con IA" : "Estructurar con IA"}
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

      {hasProposal && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
          <MessageSquarePlus size={16} className="mt-1.5 shrink-0 text-slate-400" />
          <div className="flex-1 space-y-1.5">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="Ej. Quita la tarea de materiales de soporte y baja el piloto a 50 contactos..."
              className="bg-white text-xs dark:bg-slate-950"
            />
            <Button type="button" size="sm" disabled={isPending || !feedback.trim()} onClick={handleRefine}>
              {isPending ? "Ajustando..." : "Ajustar propuesta con este comentario"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
