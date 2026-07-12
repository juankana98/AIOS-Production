import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyRow, ProjectRow, TaskRow, CheckinRow } from "@/lib/types";
import { computePriorityScore } from "@/lib/priority";

export type CompanyWithProgress = CompanyRow & {
  projects: ProjectRow[];
  avgProgress: number;
  activeProjectCount: number;
};

export async function getCompaniesWithProgress(supabase: SupabaseClient): Promise<CompanyWithProgress[]> {
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .neq("status", "cancelled");

  const byCompany = new Map<string, ProjectRow[]>();
  for (const p of (projects ?? []) as ProjectRow[]) {
    const list = byCompany.get(p.company_id) ?? [];
    list.push(p);
    byCompany.set(p.company_id, list);
  }

  return ((companies ?? []) as CompanyRow[]).map((c) => {
    const companyProjects = byCompany.get(c.id) ?? [];
    const active = companyProjects.filter((p) => p.status === "active" || p.status === "on_hold");
    const avg =
      companyProjects.length === 0
        ? 0
        : Math.round(companyProjects.reduce((sum, p) => sum + p.progress_pct, 0) / companyProjects.length);
    return {
      ...c,
      projects: companyProjects,
      avgProgress: avg,
      activeProjectCount: active.length,
    };
  });
}

export async function getTodayPriorityTasks(supabase: SupabaseClient, limit = 8): Promise<TaskRow[]> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["todo", "doing"]);

  const now = new Date();
  const sorted = ((tasks ?? []) as TaskRow[]).sort(
    (a, b) => computePriorityScore(b, now) - computePriorityScore(a, now)
  );
  return sorted.slice(0, limit);
}

export async function getOpenTimer(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("time_entries")
    .select("*, tasks(title, id, project_id)")
    .is("ended_at", null)
    .maybeSingle();
  return data;
}

export async function getCheckinStreak(supabase: SupabaseClient): Promise<number> {
  const { data: checkins } = await supabase
    .from("checkins")
    .select("checkin_date")
    .eq("type", "daily")
    .order("checkin_date", { ascending: false })
    .limit(60);

  if (!checkins || checkins.length === 0) return 0;

  const dates = new Set((checkins as Pick<CheckinRow, "checkin_date">[]).map((c) => c.checkin_date));
  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 60; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (dates.has(iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      // hoy aún no registrado — no rompe la racha, solo no suma todavía
      cursor.setDate(cursor.getDate() - 1);
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function projectSemaphore(project: ProjectRow): "verde" | "amarillo" | "rojo" {
  if (!project.due_on) return project.progress_pct >= 50 ? "verde" : "amarillo";

  const daysLeft = (new Date(project.due_on).getTime() - Date.now()) / 86_400_000;
  const totalDays =
    project.starts_on && project.due_on
      ? (new Date(project.due_on).getTime() - new Date(project.starts_on).getTime()) / 86_400_000
      : null;

  if (daysLeft < 0 && project.progress_pct < 100) return "rojo";
  if (totalDays && totalDays > 0) {
    const expectedPct = Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100));
    if (project.progress_pct + 15 < expectedPct) return "rojo";
    if (project.progress_pct + 5 < expectedPct) return "amarillo";
    return "verde";
  }
  if (daysLeft <= 3 && project.progress_pct < 80) return "amarillo";
  return "verde";
}
