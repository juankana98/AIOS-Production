import { createBrowserClient } from "@supabase/ssr";

// Sin genérico `Database` estricto a propósito: los tipos de fila viven en
// src/lib/types.ts (CompanyRow, TaskRow, ...) y se castean a mano en cada
// query de lectura. Esto evita pelear con la inferencia de insert/update de
// supabase-js cuando el Database type no se generó desde un proyecto real.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
