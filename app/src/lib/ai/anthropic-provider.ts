import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, RefineProposalInput, StructureIdeaInput, WeeklyReviewInput } from "@/lib/ai/provider";
import { REFINE_PROPOSAL_SYSTEM, STRUCTURE_IDEA_SYSTEM, WEEKLY_REVIEW_SYSTEM } from "@/lib/ai/prompts";
import { DEFAULT_TIER, REASONING_TIERS, type ReasoningTier } from "@/lib/ai/models";
import type { AiIdeaProposal } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL || REASONING_TIERS[DEFAULT_TIER].anthropicModel;

function resolveModel(tier?: ReasoningTier): string {
  return tier ? REASONING_TIERS[tier].anthropicModel : MODEL;
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
  ): Promise<AiIdeaProposal> {
    const response = await this.client.messages.create({
      model: resolveModel(tier),
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

    return toolUse.input as AiIdeaProposal;
  }

  async structureIdea(input: StructureIdeaInput): Promise<AiIdeaProposal> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.callProposeStructureTool(
      STRUCTURE_IDEA_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea:\n${input.rawText}`,
      input.tier
    );
  }

  async refineProposal(input: RefineProposalInput): Promise<AiIdeaProposal> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.callProposeStructureTool(
      REFINE_PROPOSAL_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea original:\n${input.rawText}\n\nPropuesta actual:\n${JSON.stringify(input.currentProposal, null, 2)}\n\nFeedback del usuario para ajustar la propuesta:\n${input.feedback}`,
      input.tier
    );
  }

  async generateWeeklyReview(input: WeeklyReviewInput): Promise<string> {
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
    return textBlock && textBlock.type === "text" ? textBlock.text : "";
  }
}
