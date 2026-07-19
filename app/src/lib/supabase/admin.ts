import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service_role key — bypassa RLS por completo y puede usar
 * la Admin API de Supabase Auth (invitar usuarios, leer emails por user_id).
 * SOLO usar dentro de Server Actions/Route Handlers, nunca exponer al
 * cliente. Necesario porque auth.users no es consultable vía PostgREST con
 * la anon key, y las invitaciones por email requieren privilegios de admin.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
