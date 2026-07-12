"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function recomputeProjectProgress(supabase: SupabaseClient, projectId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("progress_mode")
    .eq("id", projectId)
    .single();
  if (!project || project.progress_mode !== "auto") return;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("status")
    .eq("project_id", projectId)
    .neq("status", "cancelled");

  if (!tasks || tasks.length === 0) return;

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = Math.round((done / tasks.length) * 100);

  await supabase.from("projects").update({ progress_pct: pct }).eq("id", projectId);
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!projectId || !title) throw new Error("Proyecto y título son obligatorios");

  const { error } = await supabase.from("tasks").insert({
    owner_id: user.id,
    project_id: projectId,
    title,
    description: String(formData.get("description") ?? "") || null,
    is_urgent: formData.get("is_urgent") === "on",
    is_important: formData.get("is_important") !== "off",
    estimated_minutes: formData.get("estimated_minutes") ? Number(formData.get("estimated_minutes")) : null,
    due_at: String(formData.get("due_at") ?? "") || null,
    energy: String(formData.get("energy") ?? "medium") as "low" | "medium" | "high" | "deep",
  });
  if (error) throw new Error(error.message);

  await recomputeProjectProgress(supabase, projectId);

  revalidatePath("/tareas");
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function updateTaskStatus(taskId: string, projectId: string, status: string) {
  const supabase = await createClient();
  const payload: Record<string, unknown> = { status };
  if (status === "done") payload.completed_at = new Date().toISOString();
  else payload.completed_at = null;

  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) throw new Error(error.message);

  await recomputeProjectProgress(supabase, projectId);

  revalidatePath("/tareas");
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function deleteTask(taskId: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);

  await recomputeProjectProgress(supabase, projectId);

  revalidatePath("/tareas");
  revalidatePath(`/proyectos/${projectId}`);
}
