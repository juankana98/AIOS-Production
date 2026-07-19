"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Waves } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (data.session) {
        // Confirmación de email desactivada en el proyecto: signUp ya deja sesión iniciada.
        router.push("/");
        router.refresh();
      } else {
        setInfo("Cuenta creada. Revisa tu correo para confirmar antes de iniciar sesión.");
      }
    }
    setLoading(false);
  }

  return (
    <div className="aqua-glow relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-teal-50 via-white to-cyan-50/50 px-4 dark:from-[#071a1a] dark:via-[#071a1a] dark:to-[#0a2323]">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-6">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-900/20">
              <Waves size={22} strokeWidth={2.25} />
            </div>
            <h1 className="font-heading text-xl font-semibold text-teal-950 dark:text-teal-50">AIOS</h1>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-teal-600/70 dark:text-teal-400/60">
              Centro de Comando
            </p>
            <p className="mt-3 text-sm text-slate-500 dark:text-teal-100/50">
              {mode === "login" ? "Inicia sesión para continuar" : "Crea tu cuenta para empezar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <button
            className="mt-5 w-full cursor-pointer text-center text-xs text-slate-500 transition-colors hover:text-teal-700 dark:text-teal-100/40 dark:hover:text-teal-300"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "¿Primera vez? Crea tu cuenta" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
