"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { completeOnboarding } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ROLES = [
  "Director/CEO",
  "Gerente / líder de equipo",
  "Freelancer / independiente",
  "Otro",
];

const BUSINESS_TYPES = [
  "Servicios",
  "Comercio / retail",
  "Restaurante / alimentos",
  "Tecnología / software",
  "Otro",
];

type FormState = {
  role: string;
  business_type: string;
  business_name: string;
  main_challenge: string;
  main_goal: string;
};

const STEPS = ["Tu rol", "Tu negocio", "Tu reto", "Tu objetivo"] as const;

function OptionGrid({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
            value === opt
              ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-400/10 dark:text-teal-200"
              : "border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50/40 dark:border-white/10 dark:text-teal-100/60 dark:hover:border-teal-700"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Guardando..." : label}
    </Button>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    role: "",
    business_type: "",
    business_name: "",
    main_challenge: "",
    main_goal: "",
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canAdvance =
    (step === 0 && form.role) ||
    (step === 1 && form.business_type && form.business_name.trim()) ||
    (step === 2 && form.main_challenge.trim()) ||
    (step === 3 && form.main_goal.trim());

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  return (
    <form action={completeOnboarding} className="w-full max-w-lg space-y-6">
      <input type="hidden" name="role" value={form.role} />
      <input type="hidden" name="business_type" value={form.business_type} />
      <input type="hidden" name="business_name" value={form.business_name} />
      <input type="hidden" name="main_challenge" value={form.main_challenge} />
      <input type="hidden" name="main_goal" value={form.main_goal} />
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-teal-600" : "bg-slate-200 dark:bg-white/10"
            )}
          />
        ))}
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-600/70 dark:text-teal-400/60">
          Paso {step + 1} de {STEPS.length} · {STEPS[step]}
        </p>

        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">¿Cuál es tu rol?</h2>
            <p className="text-sm text-slate-500">Nos ayuda a priorizar qué construir primero.</p>
            <OptionGrid options={ROLES} value={form.role} onChange={(v) => update("role", v)} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Cuéntanos de tu negocio</h2>
            <OptionGrid
              options={BUSINESS_TYPES}
              value={form.business_type}
              onChange={(v) => update("business_type", v)}
            />
            <div>
              <Label htmlFor="business_name">Nombre de tu empresa/negocio</Label>
              <Input
                id="business_name"
                value={form.business_name}
                onChange={(e) => update("business_name", e.target.value)}
                placeholder="Ej. Mi Negocio S.A.S."
                required
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">¿Cuál es tu mayor reto ejecutando lo que te propones?</h2>
            <Textarea
              rows={4}
              value={form.main_challenge}
              onChange={(e) => update("main_challenge", e.target.value)}
              placeholder="Ej. Se me acumulan las tareas y pierdo de vista las prioridades reales"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">¿Qué te gustaría lograr con AIOS?</h2>
            <Textarea
              rows={4}
              value={form.main_goal}
              onChange={(e) => update("main_goal", e.target.value)}
              placeholder="Ej. Tener claridad diaria de qué avanza cada negocio y no soltar el ritmo"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="cursor-pointer text-sm font-medium text-slate-500 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-0 dark:text-teal-100/50 dark:hover:text-teal-300"
          >
            Atrás
          </button>
          {step === STEPS.length - 1 ? (
            <SubmitButton label="Empezar" disabled={!canAdvance} />
          ) : (
            <Button type="button" onClick={handleNext} disabled={!canAdvance}>
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
