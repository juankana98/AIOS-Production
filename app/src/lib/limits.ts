import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getPlanLimits, ACTIVE_PROJECT_STATUSES } from "@/lib/plans";

class PlanLimitError extends Error {}

async function requireWorkspace(supabase: SupabaseClient) {
  const workspace = await getCurrentWorkspace(supabase);
  if (!workspace) throw new Error("No tienes un workspace activo");
  return workspace;
}

export async function assertCanCreateCompany(supabase: SupabaseClient): Promise<{ workspaceId: string }> {
  const workspace = await requireWorkspace(supabase);
  const limits = getPlanLimits(workspace.plan);
  if (limits.maxCompanies !== null) {
    const { count } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("is_archived", false);
    if ((count ?? 0) >= limits.maxCompanies) {
      throw new PlanLimitError(
        `Tu plan ${limits.label} permite máximo ${limits.maxCompanies} empresa(s). Actualiza tu plan para agregar más.`
      );
    }
  }
  return { workspaceId: workspace.id };
}

export async function assertCanCreateProject(supabase: SupabaseClient): Promise<{ workspaceId: string }> {
  const workspace = await requireWorkspace(supabase);
  const limits = getPlanLimits(workspace.plan);
  if (limits.maxActiveProjects !== null) {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .in("status", ACTIVE_PROJECT_STATUSES);
    if ((count ?? 0) >= limits.maxActiveProjects) {
      throw new PlanLimitError(
        `Tu plan ${limits.label} permite máximo ${limits.maxActiveProjects} proyectos activos. Completa o cancela alguno, o actualiza tu plan.`
      );
    }
  }
  return { workspaceId: workspace.id };
}

export async function assertCanInviteMember(supabase: SupabaseClient): Promise<{ workspaceId: string }> {
  const workspace = await requireWorkspace(supabase);
  const limits = getPlanLimits(workspace.plan);
  if (limits.maxSeats !== null) {
    const { count } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);
    if ((count ?? 0) >= limits.maxSeats) {
      throw new PlanLimitError(
        `Tu plan ${limits.label} permite máximo ${limits.maxSeats} puesto(s). Actualiza tu plan para invitar a tu equipo.`
      );
    }
  }
  return { workspaceId: workspace.id };
}

export async function assertAiEnabled(supabase: SupabaseClient): Promise<void> {
  const workspace = await requireWorkspace(supabase);
  const limits = getPlanLimits(workspace.plan);
  if (!limits.aiEnabled) {
    throw new PlanLimitError(`Tu plan ${limits.label} no incluye funciones de IA. Actualiza tu plan para usarlas.`);
  }
}
