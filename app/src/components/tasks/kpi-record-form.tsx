"use client";

import { useState, useTransition } from "react";
import { recordKpiEntry } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function KpiRecordForm({ kpiId, projectId, currentValue }: { kpiId: string; projectId: string; currentValue: number }) {
  const [value, setValue] = useState(String(currentValue));
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => recordKpiEntry(kpiId, projectId, Number(value)));
      }}
    >
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-20 px-2 py-1 text-xs"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        Registrar
      </Button>
    </form>
  );
}
