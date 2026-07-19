import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshAccessToken } from "@/lib/google/oauth";
import type { GoogleCalendarConnectionRow } from "@/lib/types";

export type BusyInterval = { start: Date; end: Date };

/**
 * Devuelve un access token válido para la conexión de Google Calendar del
 * usuario, refrescándolo primero si ya expiró (con margen de 2 minutos).
 * Devuelve null si el usuario no ha conectado Google Calendar.
 */
export async function getValidGoogleAccessToken(
  supabase: SupabaseClient,
  ownerId: string
): Promise<{ accessToken: string; calendarId: string } | null> {
  const { data } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const connection = data as GoogleCalendarConnectionRow | null;
  if (!connection) return null;

  const expiresAt = new Date(connection.token_expires_at).getTime();
  const stillValid = expiresAt - Date.now() > 2 * 60_000;

  if (stillValid) {
    return { accessToken: connection.access_token, calendarId: connection.calendar_id };
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from("google_calendar_connections")
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
    .eq("owner_id", ownerId);

  return { accessToken: refreshed.access_token, calendarId: connection.calendar_id };
}

/**
 * Consulta la FreeBusy API de Google Calendar y devuelve los intervalos
 * ocupados (reuniones/eventos) dentro del rango dado. No lee el detalle de
 * los eventos (título, invitados) — solo si el rango está libre u ocupado,
 * que es lo único que necesita el scheduler.
 */
export async function fetchBusyIntervals(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusyInterval[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    }),
  });

  if (!res.ok) throw new Error(`Google FreeBusy API falló (${res.status}): ${await res.text()}`);

  const data = await res.json();
  const busy = data.calendars?.[calendarId]?.busy ?? [];
  return busy.map((b: { start: string; end: string }) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));
}
