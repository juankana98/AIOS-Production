"use server";

import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { logAiUsage } from "@/lib/ai/usage";
import type { ProjectRow, TaskRow, TimeEntryRow } from "@/lib/types";

export async function generateWeeklyReview(companyId: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: company } = await supabase.from("companies").select("name").eq("id", companyId).single();
  if (!company) throw new Error("Empresa no encontrada");

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .neq("status", "cancelled");

  const projectRows = (projects ?? []) as ProjectRow[];
  const projectIds = projectRows.map((p) => p.id);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  let tasksDone = 0;
  let tasksPlanned = 0;
  let hoursLogged = 0;

  if (projectIds.length > 0) {
    const { data: tasks } = await supabase.from("tasks").select("*").in("project_id", projectIds);
    const taskRows = (tasks ?? []) as TaskRow[];
    tasksPlanned = taskRows.length;
    tasksDone = taskRows.filter(
      (t) => t.status === "done" && t.completed_at && new Date(t.completed_at) >= weekStart
    ).length;

    const taskIds = taskRows.map((t) => t.id);
    if (taskIds.length > 0) {
      const { data: entries } = await supabase
        .from("time_entries")
        .select("*")
        .in("task_id", taskIds)
        .gte("started_at", weekStart.toISOString())
        .not("duration_seconds", "is", null);
      const entryRows = (entries ?? []) as TimeEntryRow[];
      hoursLogged = entryRows.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) / 3600;
    }
  }

  const provider = getAIProvider();
  const { result, usage } = await provider.generateWeeklyReview({
    companyName: company.name,
    projects: projectRows.map((p) => ({ name: p.name, progressPct: p.progress_pct, status: p.status })),
    tasksDoneThisWeek: tasksDone,
    tasksPlannedThisWeek: tasksPlanned,
    hoursLoggedThisWeek: Number(hoursLogged.toFixed(1)),
  });
  await logAiUsage(supabase, user.id, "weekly_review", undefined, usage);

  return result;
}
