import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { eisenhowerQuadrant, quadrantLabel, computePriorityScore, type Quadrant } from "@/lib/priority";
import { formatMinutes } from "@/lib/utils";
import type { TaskRow } from "@/lib/types";

const QUADRANTS: Quadrant[] = ["hacer_ya", "planificar", "delegar_o_agrupar", "eliminar"];

type TaskWithProject = TaskRow & { projects: { name: string; company_id: string } | null };

export default async function TareasPage() {
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, projects(name, company_id)")
    .in("status", ["todo", "doing", "blocked"]);

  const taskRows = (tasks ?? []) as unknown as TaskWithProject[];
  const now = new Date();
  const byQuadrant = new Map<Quadrant, TaskWithProject[]>();
  for (const q of QUADRANTS) byQuadrant.set(q, []);
  for (const t of taskRows) byQuadrant.get(eisenhowerQuadrant(t))!.push(t);
  for (const q of QUADRANTS) {
    byQuadrant.get(q)!.sort((a, b) => computePriorityScore(b, now) - computePriorityScore(a, now));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tareas — Matriz de Eisenhower</h1>
        <p className="text-sm text-slate-500">Todo lo pendiente en todas las empresas, ordenado por score de prioridad.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => (
          <div key={q}>
            <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
              {quadrantLabel(q)}
              <span className="text-slate-400">{byQuadrant.get(q)!.length}</span>
            </h2>
            <Card>
              <CardContent className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
                {byQuadrant.get(q)!.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {task.projects && <Badge tone="slate">{task.projects.name}</Badge>}
                        {task.estimated_minutes && <Badge tone="slate">{formatMinutes(task.estimated_minutes)}</Badge>}
                        {task.status === "blocked" && <Badge tone="red">Bloqueada</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StartTimerButton taskId={task.id} />
                      <TaskStatusSelect taskId={task.id} projectId={task.project_id} status={task.status} />
                    </div>
                  </div>
                ))}
                {byQuadrant.get(q)!.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-500">Sin tareas en este cuadrante.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
