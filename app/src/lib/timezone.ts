// Vercel corre las funciones serverless en UTC por defecto — el servidor de
// desarrollo local corre en la zona horaria del equipo (America/Bogota), así
// que un bug de zona horaria puede pasar completamente desapercibido en local
// y romper "hoy"/horario laboral en producción. Colombia no tiene horario de
// verano, así que un offset fijo es seguro (no como EE.UU./Europa).
export const LOCAL_UTC_OFFSET = "-05:00"; // America/Bogota

/** "Hoy" en hora de Colombia, sin importar en qué zona horaria corre el proceso Node. */
export function todayISO(): string {
  const now = new Date();
  const bogotaMs = now.getTime() + parseOffsetMs(LOCAL_UTC_OFFSET);
  return new Date(bogotaMs).toISOString().slice(0, 10);
}

/** Construye un Date para una hora concreta de un día (formato YYYY-MM-DD) en hora de Colombia. */
export function localDateTime(dateISO: string, hour: number, minute = 0): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${dateISO}T${hh}:${mm}:00${LOCAL_UTC_OFFSET}`);
}

/**
 * Convierte el valor crudo de un <input type="datetime-local"> (ej.
 * "2026-07-14T09:00", sin zona horaria — representa la hora de pared que
 * vio el usuario en su navegador) a un Date correcto, asumiendo que el
 * usuario está en hora de Colombia. Usar esto en vez de `new Date(value)`
 * en Server Actions: `new Date()` interpretaría ese string en la zona
 * horaria del servidor (UTC en Vercel), no en la del usuario.
 */
export function localDateTimeFromInput(datetimeLocalValue: string): Date {
  return new Date(`${datetimeLocalValue}:00${LOCAL_UTC_OFFSET}`);
}

function parseOffsetMs(offset: string): number {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [h, m] = offset.slice(1).split(":").map(Number);
  return sign * (h * 60 + m) * 60_000;
}
