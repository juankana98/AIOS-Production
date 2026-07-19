"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  ListTodo,
  CalendarClock,
  Timer,
  Target,
  Sparkles,
  LogOut,
  CircleDollarSign,
  Waves,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/tareas", label: "Tareas", icon: ListTodo },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/tiempo", label: "Tiempo", icon: Timer },
  { href: "/accountability", label: "Accountability", icon: Target },
  { href: "/ideas", label: "Ideas (IA)", icon: Sparkles },
  { href: "/uso-ia", label: "Uso & Costos", icon: CircleDollarSign },
];

export function NavSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-teal-900/[0.06] bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a1f1f]/80">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-900/20">
          <Waves size={18} strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <p className="font-heading text-sm font-semibold text-teal-950 dark:text-teal-50">AIOS</p>
          <p className="text-[11px] text-slate-400 dark:text-teal-100/40">Centro de Comando</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-teal-700 text-white shadow-sm shadow-teal-900/20"
                  : "text-slate-500 hover:bg-teal-50/70 hover:text-teal-800 dark:text-teal-100/50 dark:hover:bg-white/5 dark:hover:text-teal-50"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.25 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-teal-900/[0.06] p-3 dark:border-white/[0.06]">
        <button
          onClick={handleSignOut}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-teal-100/50 dark:hover:bg-red-400/10 dark:hover:text-red-300"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
