import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Sin genérico `Database` estricto — ver la nota en supabase/client.ts.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorado: ocurre cuando se llama desde un Server Component
            // sin poder escribir cookies (se refresca en el middleware/proxy).
          }
        },
      },
    }
  );
}
