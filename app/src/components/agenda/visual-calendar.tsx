"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Check, X, Trash2, GripVertical } from "lucide-react";
import { moveBlock, updateBlockStatus, deleteBlock } from "@/actions/schedule";
import { cn } from "@/lib/utils";
import type { ScheduleBlockRow } from "@/lib/types";

const START_HOUR = 6;
const END_HOUR = 22;
const PX_PER_MIN = 1.1;
const SNAP_MINUTES = 15;
const DAY_HEIGHT = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN;

function minutesFromDayStart(date: Date, dateISO: string): number {
  const dayStart = new Date(`${dateISO}T00:00:00`);
  dayStart.setHours(START_HOUR, 0, 0, 0);
  return (date.getTime() - dayStart.getTime()) / 60_000;
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type BusyBlock = { start: string; end: string };

function GoogleBusyLayer({ dateISO, busy }: { dateISO: string; busy: BusyBlock[] }) {
  return (
    <>
      {busy.map((b, i) => {
        const start = new Date(b.start);
        const end = new Date(b.end);
        const top = Math.max(0, minutesFromDayStart(start, dateISO) * PX_PER_MIN);
        const height = Math.max(4, (minutesFromDayStart(end, dateISO) - minutesFromDayStart(start, dateISO)) * PX_PER_MIN);
        return (
          <div
            key={i}
            className="absolute left-16 right-2 rounded-md border border-slate-300 bg-[repeating-linear-gradient(45deg,theme(colors.slate.200),theme(colors.slate.200)_6px,theme(colors.slate.100)_6px,theme(colors.slate.100)_12px)] dark:border-slate-700 dark:bg-[repeating-linear-gradient(45deg,theme(colors.slate.800),theme(colors.slate.800)_6px,theme(colors.slate.900)_6px,theme(colors.slate.900)_12px)]"
            style={{ top, height }}
            title={`Ocupado (Google Calendar): ${timeLabel(start)} – ${timeLabel(end)}`}
          >
            <span className="block px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Reunión
            </span>
          </div>
        );
      })}
    </>
  );
}

function DraggableTaskBlock({
  block,
  dateISO,
  isPending,
}: {
  block: ScheduleBlockRow;
  dateISO: string;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: block.id });

  const start = new Date(block.starts_at);
  const end = new Date(block.ends_at);
  const top = Math.max(0, minutesFromDayStart(start, dateISO) * PX_PER_MIN);
  const height = Math.max(20, (minutesFromDayStart(end, dateISO) - minutesFromDayStart(start, dateISO)) * PX_PER_MIN);

  const style: React.CSSProperties = {
    top,
    height,
    transform: transform ? `translate3d(0px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 30 : 10,
  };

  const done = block.status === "done";
  const skipped = block.status === "skipped";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group absolute left-16 right-2 flex flex-col overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm transition-shadow",
        isDragging && "shadow-lg ring-2 ring-indigo-400",
        done && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30",
        skipped && "border-amber-300 bg-amber-50 opacity-60 dark:border-amber-800 dark:bg-amber-900/20",
        !done && !skipped && block.source === "auto" && "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30",
        !done && !skipped && block.source === "manual" && "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex min-w-0 items-start gap-1">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:hover:text-slate-300"
            title="Arrastrar para reagendar"
          >
            <GripVertical size={12} />
          </button>
          <div className="min-w-0">
            <p className={cn("truncate font-medium", done && "line-through")}>{block.title}</p>
            {height > 32 && (
              <p className="text-[10px] text-slate-500">
                {timeLabel(start)} – {timeLabel(end)}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            disabled={isPending}
            title="Marcar hecho"
            onClick={() => updateBlockStatus(block.id, "done")}
            className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          >
            <Check size={11} />
          </button>
          <button
            disabled={isPending}
            title="Saltar"
            onClick={() => updateBlockStatus(block.id, "skipped")}
            className="rounded p-0.5 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            <X size={11} />
          </button>
          <button
            disabled={isPending}
            title="Eliminar"
            onClick={() => deleteBlock(block.id)}
            className="rounded p-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function VisualCalendar({
  dateISO,
  blocks,
  googleBusy,
}: {
  dateISO: string;
  blocks: ScheduleBlockRow[];
  googleBusy: BusyBlock[];
}) {
  const [isPending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const block = blocks.find((b) => b.id === event.active.id);
    if (!block || event.delta.y === 0) return;

    const start = new Date(block.starts_at);
    const end = new Date(block.ends_at);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);

    const deltaMinutes = event.delta.y / PX_PER_MIN;
    const snapped = Math.round(deltaMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    if (snapped === 0) return;

    const newStart = new Date(start.getTime() + snapped * 60_000);
    const dayStart = new Date(`${dateISO}T00:00:00`);
    dayStart.setHours(START_HOUR, 0, 0, 0);
    const dayEnd = new Date(`${dateISO}T00:00:00`);
    dayEnd.setHours(END_HOUR, 0, 0, 0);

    if (newStart < dayStart || new Date(newStart.getTime() + durationMinutes * 60_000) > dayEnd) {
      setLocalError("No cabe fuera del rango 6:00–22:00.");
      return;
    }

    setLocalError(null);
    startTransition(() => moveBlock(block.id, newStart.toISOString(), durationMinutes));
  }

  return (
    <div>
      {localError && <p className="mb-2 text-xs text-red-600">{localError}</p>}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="relative rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="relative" style={{ height: DAY_HEIGHT }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800"
                style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
              >
                <span className="absolute -top-2 left-2 w-12 text-[10px] text-slate-400">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}

            <GoogleBusyLayer dateISO={dateISO} busy={googleBusy} />

            {blocks.map((block) => (
              <DraggableTaskBlock key={block.id} block={block} dateISO={dateISO} isPending={isPending} />
            ))}
          </div>
        </div>
      </DndContext>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30" />
          Auto-agendado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900" />
          Manual
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-[repeating-linear-gradient(45deg,theme(colors.slate.200),theme(colors.slate.200)_3px,theme(colors.slate.100)_3px,theme(colors.slate.100)_6px)]" />
          Reunión (Google Calendar)
        </span>
        <span>Arrastra un bloque por el ícono ⋮⋮ para reagendar (snap de 15 min).</span>
      </div>
    </div>
  );
}
