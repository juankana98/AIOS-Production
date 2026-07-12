"use client";

import { useState, useTransition } from "react";
import { generateWeeklyReview } from "@/actions/reports";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

export function WeeklyReview({ companies }: { companies: { id: string; name: string }[] }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [review, setReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="max-w-xs">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending || !companyId}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const text = await generateWeeklyReview(companyId);
                setReview(text);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Error generando el resumen");
              }
            })
          }
        >
          <Sparkles size={14} />
          {isPending ? "Generando..." : "Generar resumen semanal (IA)"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {review && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          {review}
        </div>
      )}
    </div>
  );
}
