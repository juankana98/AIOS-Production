"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertCanCreateProject } from "@/lib/limits";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const companyId = String(formData.get("company_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const expectedOutcome = String(formData.get("expected_outcome") ?? "").trim();
  if (!companyId || !name) throw new Error("Empresa y nombre son obligatorios");

  await assertCanCreateProject(supabase);

  const { error } = await supabase.from("projects").insert({
    owner_id: user.id,
    company_id: companyId,
    okr_id: String(formData.get("okr_id") ?? "") || null,
    name,
    expected_outcome: expectedOutcome,
    description: String(formData.get("description") ?? "") || null,
    priority: Number(formData.get("priority") ?? 2),
    due_on: String(formData.get("due_on") ?? "") || null,
    starts_on: String(formData.get("starts_on") ?? "") || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/proyectos");
  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/");
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const expectedOutcome = String(formData.get("expected_outcome") ?? "").trim();
  if (!projectId || !name) throw new Error("Nombre es obligatorio");

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      expected_outcome: expectedOutcome,
      description: String(formData.get("description") ?? "") || null,
      priority: Number(formData.get("priority") ?? 2),
      due_on: String(formData.get("due_on") ?? "") || null,
      starts_on: String(formData.get("starts_on") ?? "") || null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath("/");
}

export async function updateProjectStatus(projectId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/proyectos");
  revalidatePath("/");
}

export async function setProjectManualProgress(projectId: string, progressPct: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ progress_pct: progressPct, progress_mode: "manual" })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/proyectos");
  revalidatePath("/");
}

export async function createKpi(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const targetValue = Number(formData.get("target_value") ?? 0);
  if (!projectId || !name) throw new Error("Proyecto y nombre son obligatorios");

  const { error } = await supabase.from("kpis").insert({
    owner_id: user.id,
    project_id: projectId,
    name,
    unit: String(formData.get("unit") ?? "") || "",
    target_value: targetValue,
    frequency: String(formData.get("frequency") ?? "weekly") as "daily" | "weekly" | "monthly",
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/proyectos/${projectId}`);
}

export async function recordKpiEntry(kpiId: string, projectId: string, value: number, note?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error: entryError } = await supabase.from("kpi_entries").insert({
    owner_id: user.id,
    kpi_id: kpiId,
    value,
    note: note || null,
  });
  if (entryError) throw new Error(entryError.message);

  const { error: kpiError } = await supabase.from("kpis").update({ current_value: value }).eq("id", kpiId);
  if (kpiError) throw new Error(kpiError.message);

  revalidatePath(`/proyectos/${projectId}`);
}
