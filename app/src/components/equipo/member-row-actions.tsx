"use client";

import { useState, useTransition } from "react";
import { removeMember, updateMemberRole } from "@/actions/workspace";
import { Select } from "@/components/ui/input";

export function MemberRowActions({
  membershipId,
  role,
  canManage,
  isSelf,
}: {
  membershipId: string;
  role: string;
  canManage: boolean;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (role === "owner" || !canManage) {
    return <span className="text-xs text-slate-400">{isSelf ? "Tú" : "—"}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        className="h-8 w-28 py-1 text-xs"
        defaultValue={role}
        disabled={isPending}
        onChange={(e) =>
          startTransition(async () => {
            setError(null);
            try {
              await updateMemberRole(membershipId, e.target.value as "admin" | "member");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Error");
            }
          })
        }
      >
        <option value="member">Miembro</option>
        <option value="admin">Admin</option>
      </Select>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await removeMember(membershipId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Error");
            }
          })
        }
        className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-400/10"
      >
        Quitar
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
