"use client";

import { useTransition } from "react";
import { CalendarCheck2, Unlink } from "lucide-react";
import { disconnectGoogleCalendar } from "@/actions/google-calendar";
import { Button } from "@/components/ui/button";

export function GoogleCalendarConnect({
  connected,
  email,
  error,
}: {
  connected: boolean;
  email: string | null;
  error: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (connected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
        <CalendarCheck2 size={14} />
        <span className="flex-1">
          Google Calendar conectado{email ? ` (${email})` : ""} — la agenda descuenta tus reuniones reales.
        </span>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => disconnectGoogleCalendar())}
          className="flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400"
        >
          <Unlink size={12} />
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Sin conectar: la agenda usa horario laboral fijo (8:00–19:00) sin saber de tus reuniones reales.
        </p>
        <a href="/api/google/auth">
          <Button type="button" size="sm" variant="secondary">
            <CalendarCheck2 size={14} />
            Conectar Google Calendar
          </Button>
        </a>
      </div>
      {error && (
        <p className="text-xs text-red-600">
          No se pudo conectar ({error}). Revisa que las credenciales de Google estén configuradas.
        </p>
      )}
    </div>
  );
}
