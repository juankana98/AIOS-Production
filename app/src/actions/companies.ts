"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertCanCreateCompany } from "@/lib/limits";
import { getCurrentWorkspace } from "@/lib/workspace";

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createCompany(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("El nombre es obligatorio");

  await assertCanCreateCompany(supabase);

  const { error } = await supabase.from("companies").insert({
    owner_id: user.id,
    name,
    slug: slugify(name),
    description: String(formData.get("description") ?? "") || null,
    color: String(formData.get("color") ?? "#6366f1"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/empresas");
  revalidatePath("/");
}

export async function archiveCompany(companyId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ is_archived: true })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/empresas");
}

export async function seedDefaultCompaniesIfEmpty() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Estas 3 empresas de ejemplo son del uso personal de Juan Camilo — no
  // tiene sentido sembrarlas para una firma nueva del plan Free (que
  // además solo permite 1 empresa). Los workspaces nuevos arrancan vacíos;
  // el onboarding crea su primera empresa real.
  const workspace = await getCurrentWorkspace(supabase);
  if (!workspace || workspace.plan !== "personal") return;

  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) return;

  const defaults = [
    { name: "Vetshipping", color: "#0ea5e9", description: "Logística y envíos veterinarios" },
    { name: "Restaurante", color: "#f97316", description: "Operación de restaurante" },
    { name: "Automatización & Desarrollo", color: "#6366f1", description: "Servicios de automatización y herramientas digitales" },
  ];

  await supabase.from("companies").insert(
    defaults.map((d) => ({
      owner_id: user.id,
      name: d.name,
      slug: slugify(d.name),
      description: d.description,
      color: d.color,
    }))
  );
  // Sin revalidatePath aquí a propósito: esta función se llama directamente
  // desde el render del Dashboard (Server Component), no desde un Server
  // Action disparado por un form — revalidatePath ahí es inválido en Next 16.
  // La misma request ya lee los datos frescos porque el insert ocurre antes
  // del fetch de companies en DashboardPage.
}
