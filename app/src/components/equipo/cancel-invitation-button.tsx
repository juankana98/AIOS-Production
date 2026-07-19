"use client";

import { useTransition } from "react";
import { cancelInvitation } from "@/actions/workspace";

export function CancelInvitationButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => cancelInvitation(invitationId))}
      className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-400/10"
    >
      {isPending ? "..." : "Cancelar"}
    </button>
  );
}
