import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveTimer } from "@/components/time/active-timer";
import { WeeklyTimeChart } from "@/components/time/weekly-time-chart";
import { formatSeconds } from "@/lib/utils";

type OpenEntry = {
  id: string;
  task_id: string;
  started_at: string;
  tasks: { title: string } | null;
};

type ClosedEntry = {
  id: string;
  duration_seconds: number | null;
  started_at: string;
  tasks: { title: string; projects: { name: string } | null } | null;
};

export default async function TiempoPage() {
  const supabase = await createClient();

  const { data: openEntry } = await supabase
    .from("time_entries")
    .select("id, task_id, started_at, tasks(title)")
    .is("ended_at", null)
    .maybeSingle();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: weekEntries } = await supabase
    .from("time_entries")
    .select("id, duration_seconds, started_at, tasks(title, projects(name))")
    .gte("started_at", weekStart.toISOString())
    .not("duration_seconds", "is", null);

  const entries = (weekEntries ?? []) as unknown as ClosedEntry[];
  const byProject = new Map<string, number>();
  for (const e of entries) {
    const projectName = e.tasks?.projects?.name ?? "Sin proyecto";
    byProject.set(projectName, (byProject.get(projectName) ?? 0) + (e.duration_seconds ?? 0));
  }
  const chartData = Array.from(byProject.entries()).map(([name, seconds]) => ({
    name,
    horas: Number((seconds / 3600).toFixed(2)),
  }));
  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const open = openEntry as unknown as OpenEntry | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Control de tiempos</h1>
        <p className="text-sm text-slate-500">Un solo timer activo a la vez — foco real, no multitarea de mentira.</p>
      </div>

      {open ? (
        <ActiveTimer
          entryId={open.id}
          taskId={open.task_id}
          taskTitle={open.tasks?.title ?? "Tarea"}
          startedAt={open.started_at}
        />
      ) : (
        <p className="text-sm text-slate-500">
          No hay timer activo. Inicia uno desde una tarea en{" "}
          <a href="/tareas" className="text-indigo-600 hover:underline dark:text-indigo-400">
            /tareas
          </a>
          .
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tiempo por proyecto — esta semana ({formatSeconds(totalSeconds)} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <WeeklyTimeChart data={chartData} />
          ) : (
            <p className="text-sm text-slate-500">Sin registros de tiempo esta semana todavía.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
