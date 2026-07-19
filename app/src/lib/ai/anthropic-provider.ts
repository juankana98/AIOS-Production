import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  AiUsage,
  RefineProposalInput,
  StructureIdeaInput,
  WeeklyReviewInput,
  WithUsage,
} from "@/lib/ai/provider";
import { REFINE_PROPOSAL_SYSTEM, STRUCTURE_IDEA_SYSTEM, WEEKLY_REVIEW_SYSTEM } from "@/lib/ai/prompts";
import { DEFAULT_TIER, REASONING_TIERS, type ReasoningTier } from "@/lib/ai/models";
import type { AiIdeaProposal } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL || REASONING_TIERS[DEFAULT_TIER].anthropicModel;

function resolveModel(tier?: ReasoningTier): string {
  return tier ? REASONING_TIERS[tier].anthropicModel : MODEL;
}

// Anthropic no devuelve costo en la respuesta (a diferencia de OpenRouter) —
// se calcula a mano. $/millón de tokens, mismos precios que Anthropic publica
// para estos modelos (verificado contra el catálogo de OpenRouter).
const ANTHROPIC_PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

function computeAnthropicCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = ANTHROPIC_PRICING_PER_MILLION[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

function usageFrom(model: string, response: Anthropic.Message): AiUsage {
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return {
    provider: "anthropic",
    model,
    inputTokens,
    outputTokens,
    costUsd: computeAnthropicCost(model, inputTokens, outputTokens),
  };
}

const PROPOSE_STRUCTURE_TOOL: Anthropic.Tool = {
  name: "propose_structure",
  description: "Propuesta estructurada de proyecto y/o tareas a partir de una idea suelta.",
  input_schema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["project", "tasks_only"] },
      company_slug: { type: "string" },
      project: {
        type: "object",
        properties: {
          name: { type: "string" },
          expected_outcome: { type: "string" },
          description: { type: "string" },
          priority: { type: "integer", minimum: 1, maximum: 4 },
          due_on: { type: "string" },
        },
      },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            is_urgent: { type: "boolean" },
            is_important: { type: "boolean" },
            estimated_minutes: { type: "integer" },
            energy: { type: "string", enum: ["low", "medium", "high", "deep"] },
          },
          required: ["title"],
        },
      },
      kpis: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            unit: { type: "string" },
            target_value: { type: "number" },
            frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
          },
          required: ["name", "target_value"],
        },
      },
      rationale: { type: "string" },
    },
    required: ["kind", "tasks"],
  },
};

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private async callProposeStructureTool(
    system: string,
    userContent: string,
    tier?: ReasoningTier
  ): Promise<WithUsage<AiIdeaProposal>> {
    const model = resolveModel(tier);
    const response = await this.client.messages.create({
      model,
      max_tokens: 2000,
      system,
      tools: [PROPOSE_STRUCTURE_TOOL],
      tool_choice: { type: "tool", name: "propose_structure" },
      messages: [{ role: "user", content: userContent }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("La IA no devolvió una propuesta estructurada");
    }

    return { result: toolUse.input as AiIdeaProposal, usage: usageFrom(model, response) };
  }

  async structureIdea(input: StructureIdeaInput): Promise<WithUsage<AiIdeaProposal>> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.callProposeStructureTool(
      STRUCTURE_IDEA_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea:\n${input.rawText}`,
      input.tier
    );
  }

  async refineProposal(input: RefineProposalInput): Promise<WithUsage<AiIdeaProposal>> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.callProposeStructureTool(
      REFINE_PROPOSAL_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea original:\n${input.rawText}\n\nPropuesta actual:\n${JSON.stringify(input.currentProposal, null, 2)}\n\nFeedback del usuario para ajustar la propuesta:\n${input.feedback}`,
      input.tier
    );
  }

  async generateWeeklyReview(input: WeeklyReviewInput): Promise<WithUsage<string>> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: WEEKLY_REVIEW_SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify(input, null, 2),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return { result: text, usage: usageFrom(MODEL, response) };
  }
}
