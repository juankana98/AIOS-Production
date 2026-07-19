"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateTask, deleteTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { eisenhowerQuadrant, quadrantLabel } from "@/lib/priority";
import { formatMinutes } from "@/lib/utils";
import type { TaskRow } from "@/lib/types";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  // El input espera hora de pared en Colombia — camino inverso de
  // localDateTimeFromInput (que asume que el valor del input ya es esa hora).
  const bogota = new Date(new Date(iso).getTime() - 5 * 60 * 60_000);
  return bogota.toISOString().slice(0, 16);
}

function EditTaskForm({ task, onClose }: { task: TaskRow; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          try {
            await updateTask(formData);
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Error actualizando la tarea");
          }
        })
      }
      className="space-y-3 px-4 py-3"
    >
      <input type="hidden" name="task_id" value={task.id} />
      <input type="hidden" name="project_id" value={task.project_id} />

      <div>
        <Label htmlFor={`et-title-${task.id}`}>Título</Label>
        <Input id={`et-title-${task.id}`} name="title" required defaultValue={task.title} />
      </div>
      <div>
        <Label htmlFor={`et-desc-${task.id}`}>Descripción</Label>
        <Textarea id={`et-desc-${task.id}`} name="description" rows={2} defaultValue={task.description ?? ""} />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name="is_urgent" defaultChecked={task.is_urgent} /> Urgente
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name="is_important" defaultChecked={task.is_important} /> Importante
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`et-est-${task.id}`}>Estimado (min)</Label>
          <Input
            id={`et-est-${task.id}`}
            name="estimated_minutes"
            type="number"
            defaultValue={task.estimated_minutes ?? ""}
          />
        </div>
        <div>
          <Label htmlFor={`et-energy-${task.id}`}>Energía</Label>
          <Select id={`et-energy-${task.id}`} name="energy" defaultValue={task.energy}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="deep">Deep work</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor={`et-due-${task.id}`}>Vence</Label>
        <Input
          id={`et-due-${task.id}`}
          name="due_at"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(task.due_at)}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <button
          type="button"
          className="ml-auto text-xs text-red-600 hover:underline disabled:opacity-50"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteTask(task.id, task.project_id);
              onClose();
            })
          }
        >
          Eliminar tarea
        </button>
      </div>
    </form>
  );
}

export function TaskListItem({ task }: { task: TaskRow }) {
  const [editing, setEditing] = useState(false);

  if (editing) return <EditTaskForm task={task} onClose={() => setEditing(false)} />;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${task.status === "done" ? "text-slate-400 line-through" : ""}`}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone="indigo">{quadrantLabel(eisenhowerQuadrant(task))}</Badge>
          {task.estimated_minutes && <Badge tone="slate">est. {formatMinutes(task.estimated_minutes)}</Badge>}
          {task.actual_minutes > 0 && <Badge tone="slate">real {formatMinutes(task.actual_minutes)}</Badge>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.status !== "done" && <StartTimerButton taskId={task.id} />}
        <TaskStatusSelect taskId={task.id} projectId={task.project_id} status={task.status} />
        <button
          type="button"
          title="Editar tarea"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}
