import type { TaskRow } from "@/lib/types";

export type Quadrant = "hacer_ya" | "planificar" | "delegar_o_agrupar" | "eliminar";

const QUADRANT_LABEL: Record<Quadrant, string> = {
  hacer_ya: "Hacer ya",
  planificar: "Planificar",
  delegar_o_agrupar: "Delegar / agrupar",
  eliminar: "Eliminar / backlog",
};

export function eisenhowerQuadrant(task: Pick<TaskRow, "is_urgent" | "is_important">): Quadrant {
  if (task.is_urgent && task.is_important) return "hacer_ya";
  if (!task.is_urgent && task.is_important) return "planificar";
  if (task.is_urgent && !task.is_important) return "delegar_o_agrupar";
  return "eliminar";
}

export function quadrantLabel(q: Quadrant): string {
  return QUADRANT_LABEL[q];
}

const ENERGY_WEIGHT: Record<TaskRow["energy"], number> = {
  deep: 1.15,
  high: 1.05,
  medium: 1,
  low: 0.9,
};

/**
 * Score de prioridad usado tanto para ordenar listas de tareas como para
 * decidir qué entra primero al generar bloques de agenda automáticos.
 * Combina matriz Eisenhower + urgencia por deadline + tamaño de la tarea
 * (tareas más cortas primero en empate, para generar avance visible rápido).
 */
export function computePriorityScore(task: TaskRow, now: Date = new Date()): number {
  const quadrant = eisenhowerQuadrant(task);
  const base: Record<Quadrant, number> = {
    hacer_ya: 100,
    planificar: 70,
    delegar_o_agrupar: 40,
    eliminar: 10,
  };

  let score = base[quadrant];

  if (task.due_at) {
    const hoursUntilDue = (new Date(task.due_at).getTime() - now.getTime()) / 3_600_000;
    if (hoursUntilDue < 0) score += 40; // vencida: máxima urgencia
    else if (hoursUntilDue <= 24) score += 30;
    else if (hoursUntilDue <= 72) score += 15;
    else if (hoursUntilDue <= 24 * 7) score += 5;
  }

  score *= ENERGY_WEIGHT[task.energy];

  if (task.estimated_minutes) {
    // Empuje leve a tareas cortas para desatascar el sistema (quick wins).
    if (task.estimated_minutes <= 25) score += 5;
  }

  return Math.round(score);
}

export function sortByPriority(tasks: TaskRow[], now: Date = new Date()): TaskRow[] {
  return [...tasks].sort((a, b) => computePriorityScore(b, now) - computePriorityScore(a, now));
}
