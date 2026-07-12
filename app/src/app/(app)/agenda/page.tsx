import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createManualBlock } from "@/actions/schedule";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GenerateScheduleButton } from "@/components/agenda/generate-schedule-button";
import { BlockActions } from "@/components/agenda/block-actions";
import type { ScheduleBlockRow } from "@/lib/types";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const dateISO = date ?? toISODate(new Date());

  const supabase = await createClient();
  const rangeStart = new Date(`${dateISO}T00:00:00`);
  const rangeEnd = new Date(`${dateISO}T23:59:59`);

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("*")
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString())
    .order("starts_at", { ascending: true });

  const blockRows = (blocks ?? []) as ScheduleBlockRow[];

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

      <GenerateScheduleButton dateISO={dateISO} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
              {blockRows.map((block) => (
                <div key={block.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className={`text-sm font-medium ${block.status === "done" ? "text-slate-400 line-through" : ""}`}>
                      {block.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(block.starts_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} –{" "}
                      {new Date(block.ends_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={block.source === "auto" ? "indigo" : "slate"}>{block.source}</Badge>
                    <BlockActions blockId={block.id} />
                  </div>
                </div>
              ))}
              {blockRows.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Sin bloques para este día. Genera la agenda automática o crea uno manual.
                </p>
              )}
            </CardContent>
          </Card>
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
