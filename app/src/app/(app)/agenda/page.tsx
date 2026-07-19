import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createManualBlock } from "@/actions/schedule";
import { getGoogleCalendarStatus } from "@/actions/google-calendar";
import { getGoogleBusyIntervals, computeDailyCapacity, workHoursRange } from "@/lib/capacity";
import { todayISO, localDateTime } from "@/lib/timezone";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GenerateScheduleButton } from "@/components/agenda/generate-schedule-button";
import { GoogleCalendarConnect } from "@/components/agenda/google-calendar-connect";
import { CapacityPanel } from "@/components/agenda/capacity-panel";
import { VisualCalendar } from "@/components/agenda/visual-calendar";
import type { ScheduleBlockRow } from "@/lib/types";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; google_connected?: string; google_error?: string }>;
}) {
  const { date, google_connected, google_error } = await searchParams;
  const dateISO = date ?? todayISO();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rangeStart = localDateTime(dateISO, 0, 0);
  const rangeEnd = localDateTime(dateISO, 23, 59);
  const { dayStart, dayEnd } = workHoursRange(dateISO);

  const [{ data: blocks }, googleStatus] = await Promise.all([
    supabase
      .from("schedule_blocks")
      .select("*")
      .gte("starts_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .order("starts_at", { ascending: true }),
    getGoogleCalendarStatus(),
  ]);

  const blockRows = (blocks ?? []) as ScheduleBlockRow[];

  const [{ busy: googleBusy }, capacity] = await Promise.all([
    user ? getGoogleBusyIntervals(supabase, user.id, dayStart, dayEnd) : Promise.resolve({ busy: [] }),
    user ? computeDailyCapacity(supabase, user.id, dateISO) : Promise.resolve(null),
  ]);

  const prev = new Date(rangeStart);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(rangeStart);
  next.setDate(next.getDate() + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Agenda</h1>
          <p className="text-sm text-slate-500">Time-blocking generado desde tus tareas por score de prioridad.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/agenda?date=${toISODate(prev)}`} className="text-sm text-slate-500 hover:underline">
            ← anterior
          </Link>
          <span className="text-sm font-medium">{dateISO}</span>
          <Link href={`/agenda?date=${toISODate(next)}`} className="text-sm text-slate-500 hover:underline">
            siguiente →
          </Link>
        </div>
      </div>

      {google_connected && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          Google Calendar conectado correctamente.
        </p>
      )}

      <GoogleCalendarConnect connected={googleStatus.connected} email={googleStatus.email} error={google_error ?? null} />

      {capacity && (
        <Card>
          <CardContent className="pt-4">
            <CapacityPanel capacity={capacity} />
          </CardContent>
        </Card>
      )}

      <GenerateScheduleButton dateISO={dateISO} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <VisualCalendar
            dateISO={dateISO}
            blocks={blockRows}
            googleBusy={googleBusy.map((b) => ({ start: b.start.toISOString(), end: b.end.toISOString() }))}
          />
        </div>

        <Card className="h-fit">
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-semibold">Bloque manual</h3>
            <form action={createManualBlock} className="space-y-3">
              <div>
                <Label htmlFor="b-title">Título</Label>
                <Input id="b-title" name="title" required placeholder="Ej. Reunión con proveedor" />
              </div>
              <div>
                <Label htmlFor="b-start">Inicio</Label>
                <Input id="b-start" name="starts_at" type="datetime-local" required defaultValue={`${dateISO}T09:00`} />
              </div>
              <div>
                <Label htmlFor="b-end">Fin</Label>
                <Input id="b-end" name="ends_at" type="datetime-local" required defaultValue={`${dateISO}T10:00`} />
              </div>
              <Button type="submit" className="w-full">
                Agregar bloque
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
