import Link from "next/link";
import {
  Waves,
  Building2,
  CalendarClock,
  Target,
  Sparkles,
  Users,
  CircleDollarSign,
  Check,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeRequestForm } from "@/components/marketing/upgrade-request-form";
import { PLAN_LIMITS } from "@/lib/plans";

const FEATURES = [
  {
    icon: Building2,
    title: "Empresas → Proyectos → Tareas",
    description: "Toda tu operación multi-negocio en una sola jerarquía, con % de avance visible siempre — nunca solo texto de estado.",
  },
  {
    icon: CalendarClock,
    title: "Agenda inteligente",
    description: "Prioriza por Eisenhower + urgencia + energía, y arma tu día automáticamente descontando tus reuniones reales de Google Calendar.",
  },
  {
    icon: Target,
    title: "Accountability agresivo",
    description: "Check-ins, rachas y semáforo por proyecto según velocidad real vs. la que te propusiste. Incomoda cuando no hay avance.",
  },
  {
    icon: Sparkles,
    title: "Idea → estructura con IA",
    description: "Tira una idea suelta y la IA propone proyecto, tareas y KPIs. Nunca crea nada sin que tú lo apruebes.",
  },
  {
    icon: Users,
    title: "Equipos por workspace",
    description: "Invita a tu equipo a colaborar en las mismas empresas y proyectos — billing por workspace, no por persona.",
  },
  {
    icon: CircleDollarSign,
    title: "Costos de IA transparentes",
    description: "Cada llamada de IA se mide en tokens y dólares reales — sabes exactamente cuánto cuesta operar, no solo lo intuyes.",
  },
];

const PLAN_ROWS: { label: string; free: string; pro: string }[] = [
  { label: "Empresas", free: `${PLAN_LIMITS.free.maxCompanies}`, pro: "Ilimitadas" },
  { label: "Proyectos activos", free: `${PLAN_LIMITS.free.maxActiveProjects}`, pro: "Ilimitados" },
  { label: "Asientos de equipo", free: `${PLAN_LIMITS.free.maxSeats}`, pro: "5" },
  { label: "Agente de IA (ideas, resúmenes)", free: "—", pro: "Incluido" },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#071a1a]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-900/20">
            <Waves size={18} strokeWidth={2.25} />
          </div>
          <span className="font-heading text-lg font-semibold text-teal-950 dark:text-teal-50">AIOS</span>
        </div>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-teal-700 dark:text-teal-100/70 dark:hover:text-teal-50">
          Iniciar sesión
        </Link>
      </header>

      <section className="aqua-glow relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <h1 className="font-heading text-4xl font-semibold leading-tight text-teal-950 dark:text-teal-50 sm:text-5xl">
            Centro de Comando para quienes dirigen varios negocios a la vez
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-teal-100/60">
            AIOS convierte tus metas, proyectos y tareas de cada empresa en velocidad de ejecución real: agenda automática,
            accountability agresivo y un agente de IA que estructura tus ideas — todo en un solo lugar.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login?mode=signup">
              <Button size="lg">Empieza gratis</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-teal-100/40">Sin tarjeta de crédito. Plan Free disponible de una vez.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-heading text-2xl font-semibold text-teal-950 dark:text-teal-50">
            Todo lo que necesitas para operar rápido
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-teal-100/50">
            No es un gestor de tareas genérico — es un sistema de ejecución.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                  <f.icon size={18} />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-teal-950 dark:text-teal-50">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-teal-100/50">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-teal-50/40 py-16 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-2xl font-semibold text-teal-950 dark:text-teal-50">Precios</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-teal-100/50">
              Empieza gratis. El plan Pro está por confirmarse — déjanos tu correo y te avisamos primero.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-teal-950 dark:text-teal-50">Free</h3>
                <p className="mt-1 text-3xl font-semibold text-teal-950 dark:text-teal-50">$0</p>
                <p className="mb-5 text-xs text-slate-500 dark:text-teal-100/50">por workspace, para siempre</p>
                <ul className="space-y-2 text-sm">
                  {PLAN_ROWS.map((r) => (
                    <li key={r.label} className="flex items-center gap-2 text-slate-600 dark:text-teal-100/70">
                      {r.free === "—" ? (
                        <Minus size={14} className="shrink-0 text-slate-300 dark:text-teal-100/30" />
                      ) : (
                        <Check size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
                      )}
                      {r.label}: <span className="font-medium">{r.free}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login?mode=signup" className="mt-6 block">
                  <Button className="w-full" variant="secondary">
                    Empieza gratis
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-teal-300 dark:border-teal-700">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-teal-950 dark:text-teal-50">Pro</h3>
                <p className="mt-1 text-3xl font-semibold text-teal-950 dark:text-teal-50">Próximamente</p>
                <p className="mb-5 text-xs text-slate-500 dark:text-teal-100/50">precio por confirmar</p>
                <ul className="space-y-2 text-sm">
                  {PLAN_ROWS.map((r) => (
                    <li key={r.label} className="flex items-center gap-2 text-slate-600 dark:text-teal-100/70">
                      <Check size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
                      {r.label}: <span className="font-medium">{r.pro}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <UpgradeRequestForm planInterested="pro" compact />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-slate-400 dark:text-teal-100/30">
        AIOS — Centro de Comando
      </footer>
    </div>
  );
}
