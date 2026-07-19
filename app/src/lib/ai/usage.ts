import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiUsage } from "@/lib/ai/provider";

export type AiFeature = "structure_idea" | "refine_proposal" | "weekly_review";

/**
 * Registra el costo/tokens de una llamada de IA. Nunca debe tumbar el flujo
 * principal si falla (igual que daily_capacity) — el tracking de costos es
 * importante para el negocio pero no puede romper la funcionalidad real.
 */
export async function logAiUsage(
  supabase: SupabaseClient,
  ownerId: string,
  feature: AiFeature,
  tier: string | undefined,
  usage: AiUsage
) {
  try {
    await supabase.from("ai_usage_log").insert({
      owner_id: ownerId,
      feature,
      provider: usage.provider,
      model: usage.model,
      tier: tier ?? null,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: usage.costUsd,
    });
  } catch {
    // silencioso a propósito — ver comentario arriba
  }
}
