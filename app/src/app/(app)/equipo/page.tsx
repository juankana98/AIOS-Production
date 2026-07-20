import { getWorkspaceTeamData } from "@/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { InviteMemberForm } from "@/components/equipo/invite-member-form";
import { MemberRowActions } from "@/components/equipo/member-row-actions";
import { CancelInvitationButton } from "@/components/equipo/cancel-invitation-button";
import { UpgradeRequestForm } from "@/components/marketing/upgrade-request-form";
import { createClient } from "@/lib/supabase/server";

function usagePct(used: number, max: number | null): number {
  if (max === null) return 0;
  if (max === 0) return 100;
  return Math.min(100, Math.round((used / max) * 100));
}

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
  const { workspace, members, invitations, usage } = await getWorkspaceTeamData();
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

      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Tu plan: {usage.limits.label}</CardTitle>
            <Badge tone={usage.limits.aiEnabled ? "teal" : "slate"}>
              {usage.limits.aiEnabled ? "IA incluida" : "Sin IA"}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Empresas</span>
                <span>
                  {usage.companies}
                  {usage.limits.maxCompanies !== null ? ` / ${usage.limits.maxCompanies}` : ""}
                </span>
              </div>
              <ProgressBar value={usagePct(usage.companies, usage.limits.maxCompanies)} size="sm" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Proyectos activos</span>
                <span>
                  {usage.activeProjects}
                  {usage.limits.maxActiveProjects !== null ? ` / ${usage.limits.maxActiveProjects}` : ""}
                </span>
              </div>
              <ProgressBar value={usagePct(usage.activeProjects, usage.limits.maxActiveProjects)} size="sm" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Asientos</span>
                <span>
                  {usage.seats}
                  {usage.limits.maxSeats !== null ? ` / ${usage.limits.maxSeats}` : ""}
                </span>
              </div>
              <ProgressBar value={usagePct(usage.seats, usage.limits.maxSeats)} size="sm" />
            </div>
          </CardContent>
          {workspace.plan === "free" && canManage && (
            <CardContent className="border-t border-teal-900/[0.06] pt-4 dark:border-white/[0.06]">
              <p className="mb-2 text-xs text-slate-500">
                ¿Necesitas más de lo que incluye Free? El plan Pro está por confirmarse — déjanos tu correo y te avisamos primero.
              </p>
              <UpgradeRequestForm planInterested="pro" defaultEmail={user?.email ?? ""} compact />
            </CardContent>
          )}
        </Card>
      )}

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
