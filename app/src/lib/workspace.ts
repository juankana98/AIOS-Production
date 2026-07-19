import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceRole = "owner" | "admin" | "member";

export type CurrentWorkspace = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: WorkspaceRole;
};

/**
 * Workspace actual del usuario. Fase 2 (v1): cada usuario pertenece a un
 * solo workspace (el que le crea el trigger on_auth_user_created o el que
 * le migró el backfill), así que simplemente se toma la primera membresía.
 * Cuando exista selector de workspace, este helper leerá el workspace
 * activo desde cookie/sesión en vez de tomar "el primero".
 */
export async function getCurrentWorkspace(supabase: SupabaseClient): Promise<CurrentWorkspace | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug, plan)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const ws = data.workspaces as unknown as { id: string; name: string; slug: string; plan: string };
  return { id: ws.id, name: ws.name, slug: ws.slug, plan: ws.plan, role: data.role as WorkspaceRole };
}
