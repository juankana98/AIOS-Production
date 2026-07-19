import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCompaniesWithProgress } from "@/lib/queries";
import { createCompany } from "@/actions/companies";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";

export default async function EmpresasPage() {
  const supabase = await createClient();
  const companies = await getCompaniesWithProgress(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Empresas</h1>
        <p className="text-sm text-slate-500">Cada empresa agrupa sus metas, OKRs y proyectos.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {companies.map((company) => (
            <Link key={company.id} href={`/empresas/${company.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: company.color }} />
                      {company.name}
                    </span>
                    <span className="text-xs text-slate-500">{company.projects.length} proyectos</span>
                  </div>
                  {company.description && <p className="mb-2 text-sm text-slate-500">{company.description}</p>}
                  <ProgressBar value={company.avgProgress} size="sm" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {companies.length === 0 && <p className="text-sm text-slate-500">Todavía no hay empresas registradas.</p>}
        </div>

        <Card className="h-fit">
          <CardContent className="pt-4">
            <h2 className="mb-3 text-sm font-semibold">Nueva empresa</h2>
            <ActionForm action={createCompany} className="space-y-3">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required placeholder="Ej. Vetshipping" />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" type="color" defaultValue="#6366f1" className="h-9 w-16 p-1" />
              </div>
              <Button type="submit" className="w-full">
                Crear empresa
              </Button>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
