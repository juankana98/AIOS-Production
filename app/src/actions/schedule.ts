"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computePriorityScore } from "@/lib/priority";
import type { TaskRow } from "@/lib/types";

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 19;
const MIN_BLOCK_MINUTES = 15;
const DEFAULT_TASK_MINUTES = 30;

type FreeSlot = { start: Date; end: Date };

function buildFreeSlots(dayStart: Date, dayEnd: Date, busy: { starts_at: string; ends_at: string }[]): FreeSlot[] {
  const sortedBusy = [...busy]
    .map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: FreeSlot[] = [];
  let cursor = dayStart;

  for (const block of sortedBusy) {
    if (block.start > cursor) {
      slots.push({ start: cursor, end: block.start < dayEnd ? block.start : dayEnd });
    }
    if (block.end > cursor) cursor = block.end;
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd) slots.push({ start: cursor, end: dayEnd });

  return slots.filter((s) => s.end.getTime() - s.start.getTime() >= MIN_BLOCK_MINUTES * 60_000);
}

/**
 * Genera bloques de agenda automáticos para un día: toma las tareas pendientes
 * sin bloque asignado ese día, las ordena por score de prioridad
 * (Eisenhower + urgencia por deadline + energía) y las va encajando en los
 * huecos libres de la jornada laboral, respetando bloques manuales existentes
 * (reuniones, etc.) como tiempo ocupado.
 */
export async function generateScheduleForDay(dateISO: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const dayStart = new Date(`${dateISO}T00:00:00`);
  dayStart.setHours(WORK_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(`${dateISO}T00:00:00`);
  dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

  const rangeStart = new Date(`${dateISO}T00:00:00`);
  const rangeEnd = new Date(`${dateISO}T23:59:59`);

  const { data: existingBlocks } = await supabase
    .from("schedule_blocks")
    .select("starts_at, ends_at, task_id")
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString());

  const busy = existingBlocks ?? [];
  const alreadyScheduledTaskIds = new Set(busy.map((b) => b.task_id).filter(Boolean));

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["todo", "doing"]);

  const candidates = (tasks ?? []).filter((t) => !alreadyScheduledTaskIds.has(t.id)) as TaskRow[];
  const now = new Date();
  const ordered = [...candidates].sort((a, b) => computePriorityScore(b, now) - computePriorityScore(a, now));

  let freeSlots = buildFreeSlots(dayStart, dayEnd, busy);
  const newBlocks: { owner_id: string; task_id: string; title: string; starts_at: string; ends_at: string; source: "auto" }[] = [];

  for (const task of ordered) {
    const durationMinutes = Math.max(task.estimated_minutes ?? DEFAULT_TASK_MINUTES, MIN_BLOCK_MINUTES);
    const slotIndex = freeSlots.findIndex(
      (s) => s.end.getTime() - s.start.getTime() >= durationMinutes * 60_000
    );
    if (slotIndex === -1) continue;

    const slot = freeSlots[slotIndex];
    const blockStart = slot.start;
    const blockEnd = new Date(blockStart.getTime() + durationMinutes * 60_000);

    newBlocks.push({
      owner_id: user.id,
      task_id: task.id,
      title: task.title,
      starts_at: blockStart.toISOString(),
      ends_at: blockEnd.toISOString(),
      source: "auto",
    });

    const remaining = { start: blockEnd, end: slot.end };
    freeSlots = [
      ...freeSlots.slice(0, slotIndex),
      ...(remaining.end.getTime() - remaining.start.getTime() >= MIN_BLOCK_MINUTES * 60_000 ? [remaining] : []),
      ...freeSlots.slice(slotIndex + 1),
    ];
  }

  if (newBlocks.length > 0) {
    const { error } = await supabase.from("schedule_blocks").insert(newBlocks);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/agenda");
  return { scheduled: newBlocks.length, skipped: ordered.length - newBlocks.length };
}

export async function createManualBlock(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");
  if (!title || !startsAt || !endsAt) throw new Error("Título e inicio/fin son obligatorios");

  const { error } = await supabase.from("schedule_blocks").insert({
    owner_id: user.id,
    task_id: String(formData.get("task_id") ?? "") || null,
    title,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    source: "manual",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

export async function updateBlockStatus(blockId: string, status: "planned" | "done" | "skipped") {
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_blocks").update({ status }).eq("id", blockId);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
}

export async function deleteBlock(blockId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
}
