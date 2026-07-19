import { getWorkspaceTeamData } from "@/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteMemberForm } from "@/components/equipo/invite-member-form";
import { MemberRowActions } from "@/components/equipo/member-row-actions";
import { CancelInvitationButton } from "@/components/equipo/cancel-invitation-button";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Miembro",
};

const ROLE_TONE: Record<string, "teal" | "slate"> = {
  owner: "teal",
  admin: "teal",
  member: "slate",
};

export default async function EquipoPage() {
  const { workspace, members, invitations } = await getWorkspaceTeamData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!workspace) {
    return <p className="text-sm text-slate-500">No se pudo cargar tu workspace.</p>;
  }

  const canManage = workspace.role === "owner" || workspace.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Equipo</h1>
        <p className="text-sm text-slate-500">
          {workspace.name} · billing por workspace — invita personas a colaborar en las mismas empresas y proyectos.
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invitar miembro</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteMemberForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Miembros ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {members.map((m) => (
            <div key={m.membershipId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.email}</span>
                <Badge tone={ROLE_TONE[m.role] ?? "slate"}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
              </div>
              <MemberRowActions
                membershipId={m.membershipId}
                role={m.role}
                canManage={canManage}
                isSelf={m.userId === user?.id}
              />
            </div>
          ))}
          {members.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Sin miembros.</p>}
        </CardContent>
      </Card>

      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones pendientes ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{inv.email}</span>
                  <Badge tone="slate">{ROLE_LABEL[inv.role] ?? inv.role}</Badge>
                  <span className="text-xs text-slate-400">
                    expira {new Date(inv.expiresAt).toLocaleDateString("es-CO")}
                  </span>
                </div>
                <CancelInvitationButton invitationId={inv.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
