"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertCheckin(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const type = String(formData.get("type") ?? "daily") as "daily" | "weekly";
  const checkinDate = String(formData.get("checkin_date") ?? new Date().toISOString().slice(0, 10));

  const { error } = await supabase.from("checkins").upsert(
    {
      owner_id: user.id,
      checkin_date: checkinDate,
      type,
      wins: String(formData.get("wins") ?? "") || null,
      blockers: String(formData.get("blockers") ?? "") || null,
      focus_next: String(formData.get("focus_next") ?? "") || null,
      score: formData.get("score") ? Number(formData.get("score")) : null,
    },
    { onConflict: "owner_id,checkin_date,type" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/accountability");
  revalidatePath("/");
}
