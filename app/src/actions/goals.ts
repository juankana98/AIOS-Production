"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const companyId = String(formData.get("company_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!companyId || !title) throw new Error("Empresa y título son obligatorios");

  const { error } = await supabase.from("goals").insert({
    owner_id: user.id,
    company_id: companyId,
    title,
    description: String(formData.get("description") ?? "") || null,
    period_type: String(formData.get("period_type") ?? "quarter") as "month" | "quarter" | "year" | "custom",
    starts_on: String(formData.get("starts_on") ?? "") || null,
    ends_on: String(formData.get("ends_on") ?? "") || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/empresas/${companyId}`);
}

export async function createOkr(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const companyId = String(formData.get("company_id") ?? "");
  const objective = String(formData.get("objective") ?? "").trim();
  if (!companyId || !objective) throw new Error("Empresa y objetivo son obligatorios");

  const goalId = String(formData.get("goal_id") ?? "") || null;

  const { data: okr, error } = await supabase
    .from("okrs")
    .insert({
      owner_id: user.id,
      company_id: companyId,
      goal_id: goalId,
      objective,
      description: String(formData.get("description") ?? "") || null,
      starts_on: String(formData.get("starts_on") ?? "") || null,
      ends_on: String(formData.get("ends_on") ?? "") || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const krTitles = formData.getAll("kr_title").map(String).filter(Boolean);
  const krTargets = formData.getAll("kr_target").map(String);
  const krUnits = formData.getAll("kr_unit").map(String);

  if (krTitles.length > 0 && okr) {
    const rows = krTitles.map((title, i) => ({
      owner_id: user.id,
      okr_id: okr.id,
      title,
      target_value: Number(krTargets[i] ?? 100) || 100,
      metric_unit: krUnits[i] ?? "",
    }));
    const { error: krError } = await supabase.from("key_results").insert(rows);
    if (krError) throw new Error(krError.message);
  }

  revalidatePath(`/empresas/${companyId}`);
}

export async function updateKeyResultValue(keyResultId: string, currentValue: number, companyId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("key_results")
    .update({ current_value: currentValue })
    .eq("id", keyResultId);
  if (error) throw new Error(error.message);
  revalidatePath(`/empresas/${companyId}`);
}
