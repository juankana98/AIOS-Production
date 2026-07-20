"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function requestUpgrade(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const planInterested = String(formData.get("plan_interested") ?? "pro");
  if (!email) throw new Error("El correo es obligatorio");

  const workspace = await getCurrentWorkspace(supabase);

  const { error } = await supabase.from("upgrade_requests").insert({
    workspace_id: workspace?.id ?? null,
    email,
    plan_interested: planInterested,
    message: message || null,
  });
  if (error) throw new Error(error.message);
}
