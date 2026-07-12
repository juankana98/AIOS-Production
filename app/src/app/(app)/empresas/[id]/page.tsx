import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGoal, createOkr } from "@/actions/goals";
import { createProject } from "@/actions/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import type { GoalRow, OkrRow, KeyResultRow, ProjectRow } from "@/lib/types";
import { priorityLabel } from "@/lib/utils";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).single();
  if (!company) notFound();

  const [{ data: goals }, { data: okrs }, { data: projects }] = await Promise.all([
    supabase.from("goals").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("okrs").select("*, key_results(*)").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("company_id", id).order("created_at", { ascending: false }),
  ]);

  const goalRows = (goals ?? []) as GoalRow[];
  const okrRows = (okrs ?? []) as (OkrRow & { key_results: KeyResultRow[] })[];
  const projectRows = (projects ?? []) as ProjectRow[];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: company.color }} />
        <div>
          <h1 className="text-xl font-semibold">{company.name}</h1>
          {company.description && <p className="text-sm text-slate-500">{company.description}</p>}
        </div>
      </div>

      {/* Metas */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Metas</h2>
          <div className="space-y-2">
            {goalRows.map((g) => (
              <Card key={g.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-slate-500">
                      {g.period_type} · {g.starts_on ?? "?"} → {g.ends_on ?? "?"}
                    </p>
                  </div>
                  <Badge tone={g.status === "achieved" ? "emerald" : "slate"}>{g.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {goalRows.length === 0 && <p className="text-sm text-slate-500">Sin metas todavía.</p>}
          </div>
        </div>
        <Card className="h-fit">
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-semibold">Nueva meta</h3>
            <form action={createGoal} className="space-y-3">
              <input type="hidden" name="company_id" value={id} />
              <div>
                <Label htmlFor="g-title">Título</Label>
                <Input id="g-title" name="title" required />
              </div>
              <div>
                <Label htmlFor="g-period">Periodo</Label>
                <Select id="g-period" name="period_type" defaultValue="quarter">
                  <option value="month">Mensual</option>
                  <option value="quarter">Trimestral</option>
                  <option value="year">Anual</option>
                  <option value="custom">Personalizado</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="g-start">Inicio</Label>
                  <Input id="g-start" name="starts_on" type="date" />
                </div>
                <div>
                  <Label htmlFor="g-end">Fin</Label>
                  <Input id="g-end" name="ends_on" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Crear meta
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* OKRs */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">OKRs</h2>
          <div className="space-y-2">
            {okrRows.map((okr) => (
              <Card key={okr.id}>
                <CardContent className="py-3">
                  <p className="text-sm font-medium">{okr.objective}</p>
                  <div className="mt-2 space-y-2">
                    {okr.key_results?.map((kr) => {
                      const pct =
                        kr.target_value === kr.start_value
                          ? 0
                          : Math.round(
                              ((kr.current_value - kr.start_value) / (kr.target_value - kr.start_value)) * 100
                            );
                      return (
                        <div key={kr.id}>
                          <p className="text-xs text-slate-500">
                            {kr.title} ({kr.current_value}/{kr.target_value} {kr.metric_unit})
                          </p>
                          <ProgressBar value={pct} size="sm" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
            {okrRows.length === 0 && <p className="text-sm text-slate-500">Sin OKRs todavía.</p>}
          </div>
        </div>
        <Card className="h-fit">
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-semibold">Nuevo OKR</h3>
            <form action={createOkr} className="space-y-3">
              <input type="hidden" name="company_id" value={id} />
              <div>
                <Label htmlFor="o-objective">Objetivo</Label>
                <Textarea id="o-objective" name="objective" required rows={2} />
              </div>
              {goalRows.length > 0 && (
                <div>
                  <Label htmlFor="o-goal">Meta asociada</Label>
                  <Select id="o-goal" name="goal_id" defaultValue="">
                    <option value="">(sin meta)</option>
                    {goalRows.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <Label>Key Results</Label>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="grid grid-cols-3 gap-1">
                      <Input name="kr_title" placeholder="Título KR" className="col-span-2" />
                      <Input name="kr_target" placeholder="Meta" type="number" />
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">
                Crear OKR
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Proyectos */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Proyectos</h2>
          </div>
          <div className="space-y-2">
            {projectRows.map((p) => (
              <Link key={p.id} href={`/proyectos/${p.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge tone="indigo">{priorityLabel(p.priority)}</Badge>
                    </div>
                    <p className="mb-2 text-xs text-slate-500">{p.expected_outcome}</p>
                    <ProgressBar value={p.progress_pct} size="sm" />
                  </CardContent>
                </Card>
              </Link>
            ))}
            {projectRows.length === 0 && <p className="text-sm text-slate-500">Sin proyectos todavía.</p>}
          </div>
        </div>
        <Card className="h-fit">
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-semibold">Nuevo proyecto</h3>
            <form action={createProject} className="space-y-3">
              <input type="hidden" name="company_id" value={id} />
              <div>
                <Label htmlFor="p-name">Nombre</Label>
                <Input id="p-name" name="name" required />
              </div>
              <div>
                <Label htmlFor="p-outcome">Resultado esperado</Label>
                <Textarea id="p-outcome" name="expected_outcome" rows={2} />
              </div>
              {okrRows.length > 0 && (
                <div>
                  <Label htmlFor="p-okr">OKR asociado</Label>
                  <Select id="p-okr" name="okr_id" defaultValue="">
                    <option value="">(sin OKR)</option>
                    {okrRows.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.objective.slice(0, 40)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="p-priority">Prioridad</Label>
                  <Select id="p-priority" name="priority" defaultValue="2">
                    <option value="1">Crítica</option>
                    <option value="2">Alta</option>
                    <option value="3">Media</option>
                    <option value="4">Baja</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="p-due">Fecha límite</Label>
                  <Input id="p-due" name="due_on" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Crear proyecto
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
