"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { priorityLabel } from "@/lib/utils";
import type { ProjectRow } from "@/lib/types";

export function EditProjectHeader({ project }: { project: ProjectRow }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            try {
              await updateProject(formData);
              setEditing(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Error actualizando el proyecto");
            }
          })
        }
        className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-950 dark:bg-teal-950/10"
      >
        <input type="hidden" name="project_id" value={project.id} />
        <div>
          <Label htmlFor="ep-name">Nombre</Label>
          <Input id="ep-name" name="name" required defaultValue={project.name} />
        </div>
        <div>
          <Label htmlFor="ep-outcome">Resultado esperado</Label>
          <Textarea id="ep-outcome" name="expected_outcome" rows={2} defaultValue={project.expected_outcome} />
        </div>
        <div>
          <Label htmlFor="ep-desc">Descripción</Label>
          <Textarea id="ep-desc" name="description" rows={2} defaultValue={project.description ?? ""} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="ep-priority">Prioridad</Label>
            <Select id="ep-priority" name="priority" defaultValue={String(project.priority)}>
              <option value="1">Crítica</option>
              <option value="2">Alta</option>
              <option value="3">Media</option>
              <option value="4">Baja</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ep-start">Inicio</Label>
            <Input id="ep-start" name="starts_on" type="date" defaultValue={project.starts_on ?? ""} />
          </div>
          <div>
            <Label htmlFor="ep-due">Fecha límite</Label>
            <Input id="ep-due" name="due_on" type="date" defaultValue={project.due_on ?? ""} />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <p className="text-sm text-slate-500">{project.expected_outcome}</p>
        </div>
        <button
          type="button"
          title="Editar proyecto"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <Pencil size={15} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Badge tone="teal">{priorityLabel(project.priority)}</Badge>
        {project.due_on && <Badge tone="slate">Límite: {project.due_on}</Badge>}
        <Badge tone="slate">{project.progress_mode === "auto" ? "% auto (por tareas)" : "% manual"}</Badge>
      </div>
      <div className="mt-3 max-w-md">
        <ProgressBar value={project.progress_pct} />
      </div>
    </div>
  );
}
