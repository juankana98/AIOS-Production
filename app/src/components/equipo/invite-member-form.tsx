"use client";

import { useState, useTransition } from "react";
import { inviteMember } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const RESULT_MESSAGE: Record<string, string> = {
  added_existing: "Ya tenía cuenta — se agregó directo al workspace.",
  invited: "Invitación enviada por correo.",
  invited_no_email: "Invitación guardada, pero no se pudo enviar el correo (revisa la configuración de email). Si esa persona se registra con este mismo correo, entrará automáticamente a este workspace.",
};

export function InviteMemberForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await inviteMember(formData);
        setMessage(RESULT_MESSAGE[res.mode] ?? "Listo.");
        form.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error invitando al miembro");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      id="invite-form"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Label htmlFor="invite-email">Correo</Label>
        <Input id="invite-email" name="email" type="email" required placeholder="persona@empresa.com" />
      </div>
      <div className="sm:w-40">
        <Label htmlFor="invite-role">Rol</Label>
        <Select id="invite-role" name="role" defaultValue="member">
          <option value="member">Miembro</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Invitando..." : "Invitar"}
      </Button>
      {error && <p className="text-xs text-red-600 sm:ml-2">{error}</p>}
      {message && <p className="text-xs text-teal-700 dark:text-teal-300 sm:ml-2">{message}</p>}
    </form>
  );
}
