"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const role = String(formData.get("role") ?? "").trim();
  const businessType = String(formData.get("business_type") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const mainChallenge = String(formData.get("main_challenge") ?? "").trim();
  const mainGoal = String(formData.get("main_goal") ?? "").trim();

  if (!role || !businessType || !businessName || !mainChallenge || !mainGoal) {
    throw new Error("Completa todos los campos antes de continuar");
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert({
    user_id: user.id,
    role,
    business_type: businessType,
    main_challenge: mainChallenge,
    main_goal: mainGoal,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (profileError) throw new Error(profileError.message);

  const { count } = await supabase.from("companies").select("id", { count: "exact", head: true });
  if (!count) {
    const { error: companyError } = await supabase.from("companies").insert({
      owner_id: user.id,
      name: businessName,
      slug: slugify(businessName),
      color: "#0ea5e9",
    });
    if (companyError) throw new Error(companyError.message);
  }

  redirect("/");
}
