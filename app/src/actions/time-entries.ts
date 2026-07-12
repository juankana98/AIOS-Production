"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function startTimer(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Cierra cualquier timer abierto (solo puede correr uno a la vez — foco real).
  const { data: open } = await supabase
    .from("time_entries")
    .select("id, started_at")
    .is("ended_at", null)
    .eq("owner_id", user.id);

  if (open && open.length > 0) {
    for (const entry of open) {
      const durationSeconds = Math.round(
        (Date.now() - new Date(entry.started_at).getTime()) / 1000
      );
      await supabase
        .from("time_entries")
        .update({ ended_at: new Date().toISOString(), duration_seconds: durationSeconds })
        .eq("id", entry.id);
    }
  }

  const { error } = await supabase.from("time_entries").insert({
    owner_id: user.id,
    task_id: taskId,
    started_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  await supabase.from("tasks").update({ status: "doing" }).eq("id", taskId);

  revalidatePath("/tiempo");
  revalidatePath("/tareas");
  revalidatePath("/");
}

export async function stopTimer(entryId: string, taskId: string) {
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("time_entries")
    .select("started_at")
    .eq("id", entryId)
    .single();
  if (!entry) throw new Error("Registro de tiempo no encontrado");

  const durationSeconds = Math.round((Date.now() - new Date(entry.started_at).getTime()) / 1000);

  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at: new Date().toISOString(), duration_seconds: durationSeconds })
    .eq("id", entryId);
  if (error) throw new Error(error.message);

  const { data: task } = await supabase
    .from("tasks")
    .select("actual_minutes")
    .eq("id", taskId)
    .single();

  await supabase
    .from("tasks")
    .update({ actual_minutes: (task?.actual_minutes ?? 0) + Math.round(durationSeconds / 60) })
    .eq("id", taskId);

  revalidatePath("/tiempo");
  revalidatePath("/tareas");
  revalidatePath("/");
}
