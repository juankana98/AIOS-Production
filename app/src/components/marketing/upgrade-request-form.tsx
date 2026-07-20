"use client";

import { useState, useTransition, type FormEvent } from "react";
import { requestUpgrade } from "@/actions/upgrade";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function UpgradeRequestForm({
  planInterested = "pro",
  defaultEmail = "",
  compact = false,
}: {
  planInterested?: string;
  defaultEmail?: string;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      try {
        await requestUpgrade(formData);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error enviando la solicitud");
      }
    });
  }

  if (done) {
    return (
      <p className="text-sm text-teal-700 dark:text-teal-300">
        Listo — te contactamos pronto para activar {planInterested === "team" ? "Team" : "Pro"}.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "flex flex-col gap-2 sm:flex-row" : "space-y-3"}>
      <fieldset disabled={isPending} className="contents">
        <input type="hidden" name="plan_interested" value={planInterested} />
        <Input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          placeholder="tu@correo.com"
          className={compact ? "sm:flex-1" : ""}
        />
        {!compact && <Textarea name="message" rows={2} placeholder="Cuéntanos qué necesitas (opcional)" />}
        <Button type="submit" disabled={isPending} className={compact ? "shrink-0" : "w-full"}>
          {isPending ? "Enviando..." : "Avísenme"}
        </Button>
      </fieldset>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
