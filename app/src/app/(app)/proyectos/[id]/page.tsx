import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "@/actions/tasks";
import { createKpi } from "@/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { KpiRecordForm } from "@/components/tasks/kpi-record-form";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { eisenhowerQuadrant, quadrantLabel } from "@/lib/priority";
import { formatMinutes, priorityLabel } from "@/lib/utils";
import type { TaskRow, KpiRow } from "@/lib/types";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*, companies(name, color)").eq("id", id).single();
  if (!project) notFound();

  const [{ data: tasks }, { data: kpis }] = await Promise.all([
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("kpis").select("*").eq("project_id", id),
  ]);

  const taskRows = (tasks ?? []) as TaskRow[];
  const kpiRows = (kpis ?? []) as KpiRow[];
  const company = (project as unknown as { companies: { name: string; color: string } }).companies;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/empresas/${project.company_id}`} className="text-xs text-slate-500 hover:underline">
          ← {company?.name}
        </Link>
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-slate-500">{project.expected_outcome}</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone="indigo">{priorityLabel(project.priority)}</Badge>
          {project.due_on && <Badge tone="slate">Límite: {project.due_on}</Badge>}
          <Badge tone="slate">{project.progress_mode === "auto" ? "% auto (por tareas)" : "% manual"}</Badge>
        </div>
        <div className="mt-3 max-w-md">
          <ProgressBar value={project.progress_pct} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tareas ({taskRows.length})</h2>
          </div>
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
              {taskRows.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${task.status === "done" ? "text-slate-400 line-through" : ""}`}>
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="indigo">{quadrantLabel(eisenhowerQuadrant(task))}</Badge>
                      {task.estimated_minutes && <Badge tone="slate">est. {formatMinutes(task.estimated_minutes)}</Badge>}
                      {task.actual_minutes > 0 && <Badge tone="slate">real {formatMinutes(task.actual_minutes)}</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {task.status !== "done" && <StartTimerButton taskId={task.id} />}
                    <TaskStatusSelect taskId={task.id} projectId={project.id} status={task.status} />
                  </div>
                </div>
              ))}
              {taskRows.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">Sin tareas todavía.</p>}
            </CardContent>
          </Card>

          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">KPIs</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {kpiRows.map((kpi) => (
              <Card key={kpi.id}>
                <CardContent className="space-y-2 py-3">
                  <p className="text-sm font-medium">{kpi.name}</p>
                  <p className="text-xs text-slate-500">
                    {kpi.current_value} / {kpi.target_value} {kpi.unit} · {kpi.frequency}
                  </p>
                  <ProgressBar
                    value={kpi.target_value === 0 ? 0 : Math.round((kpi.current_value / kpi.target_value) * 100)}
                    size="sm"
                  />
                  <KpiRecordForm kpiId={kpi.id} projectId={project.id} currentValue={kpi.current_value} />
                </CardContent>
              </Card>
            ))}
            {kpiRows.length === 0 && <p className="text-sm text-slate-500">Sin KPIs definidos.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <h3 className="mb-3 text-sm font-semibold">Nueva tarea</h3>
              <form action={createTask} className="space-y-3">
                <input type="hidden" name="project_id" value={project.id} />
                <div>
                  <Label htmlFor="t-title">Título</Label>
                  <Input id="t-title" name="title" required />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="is_urgent" /> Urgente
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="is_important" defaultChecked /> Importante
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="t-estimated">Estimado (min)</Label>
                    <Input id="t-estimated" name="estimated_minutes" type="number" />
                  </div>
                  <div>
                    <Label htmlFor="t-energy">Energía</Label>
                    <Select id="t-energy" name="energy" defaultValue="medium">
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="deep">Deep work</option>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="t-due">Vence</Label>
                  <Input id="t-due" name="due_at" type="datetime-local" />
                </div>
                <Button type="submit" className="w-full">
                  Crear tarea
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <h3 className="mb-3 text-sm font-semibold">Nuevo KPI</h3>
              <form action={createKpi} className="space-y-3">
                <input type="hidden" name="project_id" value={project.id} />
                <div>
                  <Label htmlFor="k-name">Nombre</Label>
                  <Input id="k-name" name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="k-target">Meta</Label>
                    <Input id="k-target" name="target_value" type="number" step="any" required />
                  </div>
                  <div>
                    <Label htmlFor="k-unit">Unidad</Label>
                    <Input id="k-unit" name="unit" placeholder="%, $, u." />
                  </div>
                </div>
                <div>
                  <Label htmlFor="k-freq">Frecuencia</Label>
                  <Select id="k-freq" name="frequency" defaultValue="weekly">
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Crear KPI
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
