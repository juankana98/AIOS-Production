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
 * Contrato único para el "cerebro" de IA de la app. Cualquier implementación
 * (Anthropic con API key, OpenRouter, etc.) se conecta aquí sin que el resto
 * del código sepa qué proveedor hay detrás. Ver src/lib/ai/index.ts para el
 * switch de proveedor según variables de entorno.
 */
export interface AIProvider {
  structureIdea(input: StructureIdeaInput): Promise<AiIdeaProposal>;
  refineProposal(input: RefineProposalInput): Promise<AiIdeaProposal>;
  generateWeeklyReview(input: WeeklyReviewInput): Promise<string>;
}
