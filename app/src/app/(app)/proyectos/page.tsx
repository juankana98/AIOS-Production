import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusSelect } from "@/components/tasks/project-status-select";
import { projectSemaphore } from "@/lib/queries";
import type { ProjectRow, CompanyRow, ProjectStatus } from "@/lib/types";
import { priorityLabel } from "@/lib/utils";

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "active", label: "Activo" },
  { status: "on_hold", label: "En pausa" },
  { status: "done", label: "Terminado" },
];

const SEMAPHORE_TONE = { verde: "emerald", amarillo: "amber", rojo: "red" } as const;

export default async function ProyectosPage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: companies }] = await Promise.all([
    supabase.from("projects").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
    supabase.from("companies").select("*"),
  ]);

  const projectRows = (projects ?? []) as ProjectRow[];
  const companyById = new Map(((companies ?? []) as CompanyRow[]).map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Proyectos</h1>
        <p className="text-sm text-slate-500">Vista de todos los proyectos, con semáforo de velocidad real vs. esperada.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = projectRows.filter((p) => p.status === col.status);
          return (
            <div key={col.status}>
              <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                {col.label}
                <span className="text-slate-400">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.map((p) => {
                  const company = companyById.get(p.company_id);
                  const semaphore = projectSemaphore(p);
                  return (
                    <Link key={p.id} href={`/proyectos/${p.id}`}>
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="space-y-2 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{p.name}</span>
                            <Badge tone={SEMAPHORE_TONE[semaphore]}>{semaphore}</Badge>
                          </div>
                          {company && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: company.color }} />
                              {company.name}
                            </span>
                          )}
                          <ProgressBar value={p.progress_pct} size="sm" />
                          <div className="flex items-center justify-between">
                            <Badge tone="teal">{priorityLabel(p.priority)}</Badge>
                            <ProjectStatusSelect projectId={p.id} status={p.status} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {items.length === 0 && <p className="text-xs text-slate-400">Sin proyectos</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
