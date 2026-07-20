import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCompaniesWithProgress, getTodayPriorityTasks, getCheckinStreak, getOpenTimer } from "@/lib/queries";
import { seedDefaultCompaniesIfEmpty } from "@/actions/companies";
import { computeDailyCapacity } from "@/lib/capacity";
import { todayISO } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { CapacityPanel } from "@/components/agenda/capacity-panel";
import { LandingPage } from "@/components/marketing/landing-page";
import { eisenhowerQuadrant, quadrantLabel } from "@/lib/priority";
import { formatMinutes } from "@/lib/utils";
import { Flame, Timer as TimerIcon } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <LandingPage />;

  await seedDefaultCompaniesIfEmpty();

  const [companies, priorityTasks, streak, openTimer, capacity] = await Promise.all([
    getCompaniesWithProgress(supabase),
    getTodayPriorityTasks(supabase),
    getCheckinStreak(supabase),
    getOpenTimer(supabase),
    user ? computeDailyCapacity(supabase, user.id, todayISO()) : Promise.resolve(null),
  ]);

  const totalProjects = companies.reduce((sum, c) => sum + c.projects.length, 0);
  const overallProgress =
    totalProjects === 0
      ? 0
      : Math.round(
          companies.reduce((sum, c) => sum + c.projects.reduce((s, p) => s + p.progress_pct, 0), 0) / totalProjects
        );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Centro de Comando</h1>
          <p className="text-sm text-slate-500">Velocidad de ejecución en todas tus empresas, hoy.</p>
        </div>
        <div className="flex items-center gap-3">
          {openTimer && (
            <Link
              href="/tiempo"
              className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            >
              <TimerIcon size={14} className="animate-pulse" />
              Timer activo
            </Link>
          )}
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            <Flame size={14} />
            {streak} {streak === 1 ? "día" : "días"} de racha
          </div>
        </div>
      </div>

      {capacity && (
        <Card>
          <CardContent className="pt-4">
            <CapacityPanel capacity={capacity} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Avance global</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar value={overallProgress} />
            <p className="mt-2 text-xs text-slate-500">{totalProjects} proyectos activos en el sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{companies.length}</p>
            <p className="text-xs text-slate-500">unidades de negocio bajo seguimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tareas priorizadas hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{priorityTasks.length}</p>
            <p className="text-xs text-slate-500">
              <Link href="/agenda" className="text-teal-700 hover:underline dark:text-teal-400">
                generar agenda del día →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Avance por empresa</h2>
          <div className="space-y-3">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardContent className="pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Link href={`/empresas/${company.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: company.color }}
                      />
                      {company.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {company.activeProjectCount} proyecto{company.activeProjectCount === 1 ? "" : "s"} activo
                      {company.activeProjectCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ProgressBar value={company.avgProgress} size="sm" />
                </CardContent>
              </Card>
            ))}
            {companies.length === 0 && (
              <p className="text-sm text-slate-500">
                Aún no hay empresas.{" "}
                <Link href="/empresas" className="text-teal-700 hover:underline dark:text-teal-400">
                  Crea la primera →
                </Link>
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Próximo a ejecutar (por score de prioridad)
          </h2>
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
              {priorityTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="teal">{quadrantLabel(eisenhowerQuadrant(task))}</Badge>
                      {task.estimated_minutes && (
                        <Badge tone="slate">{formatMinutes(task.estimated_minutes)}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {priorityTasks.length === 0 && (
                <p className="px-4 py-6 text-sm text-slate-500">
                  No hay tareas pendientes. Crea proyectos y tareas, o tira una idea a la IA en{" "}
                  <Link href="/ideas" className="text-teal-700 hover:underline dark:text-teal-400">
                    /ideas
                  </Link>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
