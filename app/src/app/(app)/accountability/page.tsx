import { createClient } from "@/lib/supabase/server";
import { getCheckinStreak, projectSemaphore } from "@/lib/queries";
import { computeDailyCapacity } from "@/lib/capacity";
import { todayISO } from "@/lib/timezone";
import { upsertCheckin } from "@/actions/checkins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WeeklyReview } from "@/components/accountability/weekly-review";
import { CapacityPanel } from "@/components/agenda/capacity-panel";
import { Flame } from "lucide-react";
import type { CheckinRow, CompanyRow, ProjectRow } from "@/lib/types";

const SEMAPHORE_TONE = { verde: "emerald", amarillo: "amber", rojo: "red" } as const;

export default async function AccountabilityPage() {
  const supabase = await createClient();
  const today = todayISO();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [streak, { data: todayCheckin }, { data: recentCheckins }, { data: companies }, { data: projects }, capacity] =
    await Promise.all([
      getCheckinStreak(supabase),
      supabase.from("checkins").select("*").eq("checkin_date", today).eq("type", "daily").maybeSingle(),
      supabase
        .from("checkins")
        .select("*")
        .eq("type", "daily")
        .order("checkin_date", { ascending: false })
        .limit(10),
      supabase.from("companies").select("*").eq("is_archived", false),
      supabase.from("projects").select("*").eq("status", "active"),
      user ? computeDailyCapacity(supabase, user.id, today) : Promise.resolve(null),
    ]);

  const checkin = todayCheckin as CheckinRow | null;
  const companyRows = (companies ?? []) as CompanyRow[];
  const projectRows = (projects ?? []) as ProjectRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Accountability</h1>
          <p className="text-sm text-slate-500">Que avanzar sea la única opción aceptable.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
          <Flame size={14} />
          {streak} {streak === 1 ? "día" : "días"} de racha
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Semáforo de proyectos activos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectRows.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <Badge tone={SEMAPHORE_TONE[projectSemaphore(p)]}>{projectSemaphore(p)}</Badge>
                </div>
              ))}
              {projectRows.length === 0 && <p className="text-sm text-slate-500">No hay proyectos activos.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen semanal generado por IA</CardTitle>
            </CardHeader>
            <CardContent>
              {companyRows.length > 0 ? (
                <WeeklyReview companies={companyRows.map((c) => ({ id: c.id, name: c.name }))} />
              ) : (
                <p className="text-sm text-slate-500">Crea al menos una empresa primero.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimos check-ins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((recentCheckins ?? []) as CheckinRow[]).map((c) => (
                <div key={c.id} className="border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.checkin_date}</span>
                    {c.score && <Badge tone="indigo">{c.score}/5</Badge>}
                  </div>
                  {c.wins && <p className="text-xs text-slate-500">Wins: {c.wins}</p>}
                  {c.blockers && <p className="text-xs text-slate-500">Bloqueos: {c.blockers}</p>}
                </div>
              ))}
              {(recentCheckins ?? []).length === 0 && <p className="text-sm text-slate-500">Sin check-ins todavía.</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 pt-4">
            {capacity && (
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <CapacityPanel capacity={capacity} compact />
              </div>
            )}
            <h3 className="text-sm font-semibold">Check-in de hoy</h3>
            <form action={upsertCheckin} className="space-y-3">
              <input type="hidden" name="type" value="daily" />
              <input type="hidden" name="checkin_date" value={today} />
              <div>
                <Label htmlFor="c-wins">Wins de hoy</Label>
                <Textarea id="c-wins" name="wins" rows={2} defaultValue={checkin?.wins ?? ""} />
              </div>
              <div>
                <Label htmlFor="c-blockers">Bloqueos</Label>
                <Textarea id="c-blockers" name="blockers" rows={2} defaultValue={checkin?.blockers ?? ""} />
              </div>
              <div>
                <Label htmlFor="c-focus">Foco de mañana</Label>
                <Textarea id="c-focus" name="focus_next" rows={2} defaultValue={checkin?.focus_next ?? ""} />
              </div>
              <div>
                <Label htmlFor="c-score">Puntaje del día (1-5)</Label>
                <Input id="c-score" name="score" type="number" min={1} max={5} defaultValue={checkin?.score ?? undefined} />
              </div>
              <Button type="submit" className="w-full">
                {checkin ? "Actualizar check-in" : "Registrar check-in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
