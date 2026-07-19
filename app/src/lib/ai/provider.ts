import type { AiIdeaProposal } from "@/lib/types";
import type { ReasoningTier } from "@/lib/ai/models";

export type StructureIdeaInput = {
  rawText: string;
  companies: { id: string; name: string; slug: string }[];
  tier?: ReasoningTier;
};

export type RefineProposalInput = {
  rawText: string;
  currentProposal: AiIdeaProposal;
  feedback: string;
  companies: { id: string; name: string; slug: string }[];
  tier?: ReasoningTier;
};

export type WeeklyReviewInput = {
  companyName: string;
  projects: { name: string; progressPct: number; status: string }[];
  tasksDoneThisWeek: number;
  tasksPlannedThisWeek: number;
  hoursLoggedThisWeek: number;
};

/**
 * Costo y tokens de una llamada de IA — capturado en cada respuesta para
 * poder loguearlo (ver src/lib/ai/usage.ts) y así calcular el costo
 * marginal real por usuario. costUsd viene directo de OpenRouter cuando ese
 * es el proveedor; para Anthropic directo se calcula con una tabla de
 * precios propia (ver anthropic-provider.ts).
 */
export type AiUsage = {
  provider: "anthropic" | "openrouter";
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type WithUsage<T> = { result: T; usage: AiUsage };

/**
 * Contrato único para el "cerebro" de IA de la app. Cualquier implementación
 * (Anthropic con API key, OpenRouter, etc.) se conecta aquí sin que el resto
 * del código sepa qué proveedor hay detrás. Ver src/lib/ai/index.ts para el
 * switch de proveedor según variables de entorno.
 */
export interface AIProvider {
  structureIdea(input: StructureIdeaInput): Promise<WithUsage<AiIdeaProposal>>;
  refineProposal(input: RefineProposalInput): Promise<WithUsage<AiIdeaProposal>>;
  generateWeeklyReview(input: WeeklyReviewInput): Promise<WithUsage<string>>;
}
