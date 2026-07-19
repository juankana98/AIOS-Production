"use client";

import { useState, useTransition, type ReactNode, type FormEvent } from "react";

export function ActionForm({
  action,
  children,
  className,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<unknown>;
  children: ReactNode;
  className?: string;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      try {
        await action(formData);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
