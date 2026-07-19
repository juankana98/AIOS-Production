import { Waves } from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <div className="aqua-glow relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-teal-50 via-white to-cyan-50/50 px-4 py-12 dark:from-[#071a1a] dark:via-[#071a1a] dark:to-[#0a2323]">
      <div className="flex w-full max-w-lg flex-col items-center">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-900/20">
            <Waves size={22} strokeWidth={2.25} />
          </div>
          <h1 className="font-heading text-xl font-semibold text-teal-950 dark:text-teal-50">
            Bienvenido a AIOS
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-teal-100/50">
            Cuéntanos un poco de ti antes de entrar — nos toma un minuto.
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
