import { createClient } from "@/lib/supabase/server";
import { createIdea } from "@/actions/ideas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IdeaActions } from "@/components/ideas/idea-actions";
import type { IdeaInboxRow } from "@/lib/types";

const STATUS_TONE = {
  pending: "slate",
  processing: "amber",
  processed: "emerald",
  discarded: "red",
} as const;

export default async function IdeasPage() {
  const supabase = await createClient();
  const { data: ideas } = await supabase
    .from("idea_inbox")
    .select("*")
    .neq("status", "discarded")
    .order("created_at", { ascending: false });

  const ideaRows = (ideas ?? []) as IdeaInboxRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bandeja de ideas</h1>
        <p className="text-sm text-slate-500">
          Tira la idea suelta acá. La IA propone si es un proyecto completo o solo tareas, y tú apruebas antes de crear nada.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form action={createIdea} className="space-y-3">
            <Textarea
              name="raw_text"
              required
              rows={3}
              placeholder="Ej. Hay que automatizar el reporte semanal de ventas del restaurante para no hacerlo a mano..."
            />
            <Button type="submit">Enviar idea</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {ideaRows.map((idea) => (
          <Card key={idea.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{idea.raw_text}</p>
                <Badge tone={STATUS_TONE[idea.status as keyof typeof STATUS_TONE]}>{idea.status}</Badge>
              </div>

              {idea.ai_proposal && (
                <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 text-sm dark:border-teal-950/40 dark:bg-teal-950/10">
                  <p className="mb-1 font-medium">
                    {idea.ai_proposal.kind === "project"
                      ? `Proyecto: ${idea.ai_proposal.project?.name || "(sin título propuesto)"}`
                      : "Solo tareas"}
                  </p>
                  {idea.ai_proposal.project?.expected_outcome && (
                    <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
                      Resultado esperado: {idea.ai_proposal.project.expected_outcome}
                    </p>
                  )}
                  <ul className="ml-4 list-disc space-y-0.5 text-xs">
                    {idea.ai_proposal.tasks.map((t, i) => (
                      <li key={i}>{t.title}</li>
                    ))}
                  </ul>
                  {idea.ai_proposal.rationale && (
                    <p className="mt-2 text-xs italic text-slate-500">{idea.ai_proposal.rationale}</p>
                  )}
                </div>
              )}

              {idea.status !== "processed" && (
                <IdeaActions ideaId={idea.id} hasProposal={Boolean(idea.ai_proposal)} />
              )}
            </CardContent>
          </Card>
        ))}
        {ideaRows.length === 0 && <p className="text-sm text-slate-500">Bandeja vacía. Escribe tu primera idea arriba.</p>}
      </div>
    </div>
  );
}
