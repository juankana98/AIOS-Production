"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GoogleCalendarConnectionRow } from "@/lib/types";

export async function getGoogleCalendarStatus(): Promise<{
  connected: boolean;
  email: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false, email: null };

  const { data } = await supabase
    .from("google_calendar_connections")
    .select("google_email")
    .eq("owner_id", user.id)
    .maybeSingle();

  const connection = data as Pick<GoogleCalendarConnectionRow, "google_email"> | null;
  return { connected: Boolean(connection), email: connection?.google_email ?? null };
}

export async function disconnectGoogleCalendar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("google_calendar_connections").delete().eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}
