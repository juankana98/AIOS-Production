import { createClient } from "@/lib/supabase/server";
import { localDateTime, todayISO } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type UsageRow = {
  id: string;
  feature: "structure_idea" | "refine_proposal" | "weekly_review";
  provider: string;
  model: string;
  tier: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  created_at: string;
};

const FEATURE_LABEL: Record<UsageRow["feature"], string> = {
  structure_idea: "Estructurar idea",
  refine_proposal: "Ajustar propuesta",
  weekly_review: "Resumen semanal",
};

function usd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function sumCost(rows: UsageRow[]): number {
  return rows.reduce((s, r) => s + Number(r.cost_usd), 0);
}

export default async function UsoIaPage() {
  const supabase = await createClient();
  const today = todayISO();

  const monthStart = today.slice(0, 8) + "01";
  const weekAgo = new Date(localDateTime(today, 0, 0).getTime() - 7 * 24 * 60 * 60_000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("ai_usage_log")
    .select("*")
    .gte("created_at", localDateTime(monthStart, 0, 0).toISOString())
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as UsageRow[];

  const todayRows = rows.filter((r) => r.created_at >= localDateTime(today, 0, 0).toISOString());
  const weekRows = rows.filter((r) => r.created_at >= localDateTime(weekAgo, 0, 0).toISOString());
  const monthRows = rows;

  const byFeature = new Map<string, { count: number; cost: number }>();
  const byModel = new Map<string, { count: number; cost: number }>();
  for (const r of monthRows) {
    const f = byFeature.get(r.feature) ?? { count: 0, cost: 0 };
    f.count++;
    f.cost += Number(r.cost_usd);
    byFeature.set(r.feature, f);

    const m = byModel.get(r.model) ?? { count: 0, cost: 0 };
    m.count++;
    m.cost += Number(r.cost_usd);
    byModel.set(r.model, m);
  }

  const daysElapsedThisMonth = Number(today.slice(8, 10));
  const projectedMonthCost = daysElapsedThisMonth > 0 ? (sumCost(monthRows) / daysElapsedThisMonth) * 30 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Uso & Costos de IA</h1>
        <p className="text-sm text-slate-500">
          Costo real por llamada (tokens + $ exactos de OpenRouter/Anthropic) — la base para calcular cuánto cuesta
          un usuario en la plataforma y fijar el precio de la membresía.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{usd(sumCost(todayRows))}</p>
            <p className="text-xs text-slate-500">{todayRows.length} llamadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{usd(sumCost(weekRows))}</p>
            <p className="text-xs text-slate-500">{weekRows.length} llamadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{usd(sumCost(monthRows))}</p>
            <p className="text-xs text-slate-500">{monthRows.length} llamadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Proyección mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{usd(projectedMonthCost)}</p>
            <p className="text-xs text-slate-500">extrapolado al ritmo actual — costo estimado de este usuario/mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por función (este mes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(byFeature.entries()).map(([feature, v]) => (
              <div key={feature} className="flex items-center justify-between text-sm">
                <span>{FEATURE_LABEL[feature as UsageRow["feature"]] ?? feature}</span>
                <span className="text-slate-500">
                  {usd(v.cost)} · {v.count} llamadas
                </span>
              </div>
            ))}
            {byFeature.size === 0 && <p className="text-sm text-slate-500">Sin uso registrado todavía.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por modelo (este mes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(byModel.entries()).map(([model, v]) => (
              <div key={model} className="flex items-center justify-between text-sm">
                <span className="truncate">{model}</span>
                <span className="shrink-0 text-slate-500">
                  {usd(v.cost)} · {v.count} llamadas
                </span>
              </div>
            ))}
            {byModel.size === 0 && <p className="text-sm text-slate-500">Sin uso registrado todavía.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas llamadas</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {monthRows.slice(0, 30).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Badge tone="teal">{FEATURE_LABEL[r.feature] ?? r.feature}</Badge>
                <span className="text-slate-500">{r.model}</span>
                {r.tier && <Badge tone="slate">{r.tier}</Badge>}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  {r.input_tokens + r.output_tokens} tok
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{usd(Number(r.cost_usd))}</span>
                <span>{new Date(r.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            </div>
          ))}
          {monthRows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Sin llamadas registradas este mes. Usa el agente de IA en /ideas para empezar a ver datos acá.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
