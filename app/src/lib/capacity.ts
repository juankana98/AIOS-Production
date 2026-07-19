import type { SupabaseClient } from "@supabase/supabase-js";
import { getValidGoogleAccessToken, fetchBusyIntervals, type BusyInterval } from "@/lib/google/calendar";
import { localDateTime } from "@/lib/timezone";

export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 19;

// Usa hora de Colombia explícita (no la del servidor) — Vercel corre en UTC
// por defecto, así que .setHours() en local time rompería el horario
// laboral en producción aunque funcione bien en desarrollo local.
export function workHoursRange(dateISO: string): { dayStart: Date; dayEnd: Date } {
  const dayStart = localDateTime(dateISO, WORK_START_HOUR);
  const dayEnd = localDateTime(dateISO, WORK_END_HOUR);
  return { dayStart, dayEnd };
}

/**
 * Reuniones reales de Google Calendar dentro del rango dado. Devuelve []
 * (sin error) si el usuario no ha conectado Google Calendar — el resto del
 * sistema debe seguir funcionando con el horario laboral fijo como fallback.
 */
export async function getGoogleBusyIntervals(
  supabase: SupabaseClient,
  ownerId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<{ busy: BusyInterval[]; connected: boolean }> {
  const conn = await getValidGoogleAccessToken(supabase, ownerId);
  if (!conn) return { busy: [], connected: false };

  const busy = await fetchBusyIntervals(conn.accessToken, conn.calendarId, rangeStart, rangeEnd);
  return { busy, connected: true };
}

function intersectMinutes(windowStart: Date, windowEnd: Date, intervals: BusyInterval[]): number {
  let minutes = 0;
  for (const interval of intervals) {
    const start = interval.start > windowStart ? interval.start : windowStart;
    const end = interval.end < windowEnd ? interval.end : windowEnd;
    if (end > start) minutes += (end.getTime() - start.getTime()) / 60_000;
  }
  return minutes;
}

export type CapacityResult = {
  availableMinutes: number;
  executedMinutes: number;
  source: "google_calendar" | "fallback_work_hours";
  performancePct: number;
};

/**
 * Capacidad real del día: horario laboral menos reuniones de Google Calendar
 * (si está conectado) — independiente de qué tareas ya se hayan agendado.
 * Se cruza contra el tiempo realmente trabajado (time_entries) para dar un
 * % de desempeño honesto: "de lo que de verdad podías avanzar hoy, cuánto
 * avanzaste". Se cachea en daily_capacity para no golpear la API de Google
 * en cada carga de página y para poder ver tendencia histórica.
 */
export async function computeDailyCapacity(
  supabase: SupabaseClient,
  ownerId: string,
  dateISO: string
): Promise<CapacityResult> {
  const { dayStart, dayEnd } = workHoursRange(dateISO);
  const totalWorkMinutes = (dayEnd.getTime() - dayStart.getTime()) / 60_000;

  const { busy, connected } = await getGoogleBusyIntervals(supabase, ownerId, dayStart, dayEnd);
  const busyMinutes = intersectMinutes(dayStart, dayEnd, busy);
  const availableMinutes = Math.max(0, Math.round(totalWorkMinutes - busyMinutes));

  const rangeStart = localDateTime(dateISO, 0, 0);
  const rangeEnd = localDateTime(dateISO, 23, 59);
  const { data: entries } = await supabase
    .from("time_entries")
    .select("duration_seconds")
    .eq("owner_id", ownerId)
    .gte("started_at", rangeStart.toISOString())
    .lte("started_at", rangeEnd.toISOString())
    .not("duration_seconds", "is", null);

  const executedMinutes = Math.round(
    ((entries ?? []).reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0)) / 60
  );

  const source: CapacityResult["source"] = connected ? "google_calendar" : "fallback_work_hours";
  const performancePct = availableMinutes === 0 ? 0 : Math.min(100, Math.round((executedMinutes / availableMinutes) * 100));

  // El cache es un nice-to-have (histórico/tendencia futura) — si falla (ej.
  // la tabla todavía no existe en este entorno) no debe tumbar el panel de
  // capacidad, que es lo que el usuario realmente necesita ver.
  try {
    await supabase.from("daily_capacity").upsert(
      {
        owner_id: ownerId,
        capacity_date: dateISO,
        available_minutes: availableMinutes,
        executed_minutes: executedMinutes,
        source,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,capacity_date" }
    );
  } catch {
    // silencioso a propósito, ver comentario arriba
  }

  return { availableMinutes, executedMinutes, source, performancePct };
}
