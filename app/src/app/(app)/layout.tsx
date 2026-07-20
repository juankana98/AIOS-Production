import { NavSidebar } from "@/components/layout/nav-sidebar";
import { createClient } from "@/lib/supabase/server";

// Solo "/" es alcanzable sin sesión dentro de este grupo de rutas (el resto
// ya redirige a /login en proxy.ts) — sin sesión se muestra la landing page
// a pantalla completa, sin el shell de sidebar que asume un usuario logueado.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <>{children}</>;

  return (
    <div className="aqua-glow flex h-full min-h-screen w-full">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
