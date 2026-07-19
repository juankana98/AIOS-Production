export type PlanId = "personal" | "free" | "pro" | "team";

export type PlanLimits = {
  label: string;
  maxCompanies: number | null;
  maxActiveProjects: number | null;
  maxSeats: number | null;
  aiEnabled: boolean;
};

// null = sin tope. 'personal' es el plan interno (workspace(s) previos al
// lanzamiento de freemium) — sin topes, no se ofrece a firmas nuevas.
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  personal: { label: "Personal", maxCompanies: null, maxActiveProjects: null, maxSeats: null, aiEnabled: true },
  free: { label: "Free", maxCompanies: 1, maxActiveProjects: 3, maxSeats: 1, aiEnabled: false },
  pro: { label: "Pro", maxCompanies: null, maxActiveProjects: null, maxSeats: 5, aiEnabled: true },
  team: { label: "Team", maxCompanies: null, maxActiveProjects: null, maxSeats: null, aiEnabled: true },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
}

// Estados de proyecto que cuentan contra el tope de "proyectos activos".
export const ACTIVE_PROJECT_STATUSES = ["backlog", "active", "on_hold"] as const;
