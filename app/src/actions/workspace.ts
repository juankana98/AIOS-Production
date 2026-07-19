"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/workspace";
import { assertCanInviteMember } from "@/lib/limits";
import { getPlanLimits, ACTIVE_PROJECT_STATUSES, type PlanLimits } from "@/lib/plans";

export type WorkspaceMemberView = {
  membershipId: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
};

export type WorkspaceInvitationView = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
};

export type PlanUsage = {
  limits: PlanLimits;
  companies: number;
  activeProjects: number;
  seats: number;
};

export async function getWorkspaceTeamData(): Promise<{
  workspace: Awaited<ReturnType<typeof getCurrentWorkspace>>;
  members: WorkspaceMemberView[];
  invitations: WorkspaceInvitationView[];
  usage: PlanUsage | null;
}> {
  const supabase = await createClient();
  const workspace = await getCurrentWorkspace(supabase);
  if (!workspace) return { workspace: null, members: [], invitations: [], usage: null };

  const [{ data: memberRows }, { data: invitationRows }, { count: companiesCount }, { count: projectsCount }] =
    await Promise.all([
      supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("workspace_invitations")
        .select("id, email, role, created_at, expires_at")
        .eq("workspace_id", workspace.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("is_archived", false),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .in("status", ACTIVE_PROJECT_STATUSES),
    ]);

  // auth.users no es consultable con la anon key — se resuelven los emails
  // de los miembros con la Admin API (service role, solo server-side).
  const admin = createAdminClient();
  const members: WorkspaceMemberView[] = await Promise.all(
    (memberRows ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      return {
        membershipId: m.id,
        userId: m.user_id,
        email: data.user?.email ?? "(desconocido)",
        role: m.role,
        joinedAt: m.created_at,
      };
    })
  );

  const invitations: WorkspaceInvitationView[] = (invitationRows ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
  }));

  const usage: PlanUsage = {
    limits: getPlanLimits(workspace.plan),
    companies: companiesCount ?? 0,
    activeProjects: projectsCount ?? 0,
    seats: members.length,
  };

  return { workspace, members, invitations, usage };
}

export async function inviteMember(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member") as "admin" | "member";
  if (!email) throw new Error("El correo es obligatorio");

  const workspace = await getCurrentWorkspace(supabase);
  if (!workspace) throw new Error("No tienes un workspace activo");
  if (workspace.role !== "owner" && workspace.role !== "admin") {
    throw new Error("Solo el owner o un admin del workspace pueden invitar miembros");
  }

  await assertCanInviteMember(supabase);

  const admin = createAdminClient();

  // ¿Ya existe una cuenta con ese correo? Si sí, se agrega directo al
  // workspace (RLS ya valida que quien invita es owner/admin) — no hace
  // falta mandarle invitación por correo, con eso le basta para entrar la
  // próxima vez que inicie sesión.
  const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = existingList?.users.find((u) => u.email?.toLowerCase() === email);

  if (existingUser) {
    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: existingUser.id,
      role,
    });
    if (error) {
      if (error.code === "23505") throw new Error("Esa persona ya es parte del workspace");
      throw new Error(error.message);
    }
    revalidatePath("/equipo");
    return { mode: "added_existing" as const };
  }

  // Usuario nuevo: registra la invitación (para que el trigger de signup lo
  // una a este workspace en vez de crearle uno personal) y trata de mandarle
  // el correo de invitación de Supabase. Si el envío falla (ej. SMTP no
  // configurado), la invitación queda guardada igual — si esa persona se
  // registra por su cuenta con este mismo correo, el trigger la conecta.
  const { error: invError } = await supabase.from("workspace_invitations").insert({
    workspace_id: workspace.id,
    email,
    role,
    invited_by: user.id,
  });
  if (invError) {
    if (invError.code === "23505") throw new Error("Ya hay una invitación pendiente para ese correo");
    throw new Error(invError.message);
  }

  try {
    await admin.auth.admin.inviteUserByEmail(email);
  } catch {
    revalidatePath("/equipo");
    return { mode: "invited_no_email" as const };
  }

  revalidatePath("/equipo");
  return { mode: "invited" as const };
}

export async function removeMember(membershipId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_members").delete().eq("id", membershipId);
  if (error) throw new Error(error.message);
  revalidatePath("/equipo");
}

export async function updateMemberRole(membershipId: string, role: "admin" | "member") {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_members").update({ role }).eq("id", membershipId);
  if (error) throw new Error(error.message);
  revalidatePath("/equipo");
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invitations").delete().eq("id", invitationId);
  if (error) throw new Error(error.message);
  revalidatePath("/equipo");
}
