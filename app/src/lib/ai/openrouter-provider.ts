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

const MODEL = process.env.OPENROUTER_MODEL || REASONING_TIERS[DEFAULT_TIER].openrouterModel;

function resolveModel(tier?: ReasoningTier): string {
  return tier ? REASONING_TIERS[tier].openrouterModel : MODEL;
}

// Algunos modelos ignoran response_format:"json_object" y envuelven la
// respuesta en un bloque ```json ... ``` de todos modos — se limpia antes de parsear.
function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fenced ? fenced[1] : content);
}

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
};

function usageFrom(model: string, data: OpenRouterResponse): AiUsage {
  return {
    provider: "openrouter",
    model: data.model || model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    // OpenRouter ya calcula el costo real (incluye su margen) — no hay que estimarlo a mano.
    costUsd: data.usage?.cost ?? 0,
  };
}

/**
 * Fase 2 (multi-usuario): implementación equivalente a AnthropicProvider pero
 * vía OpenRouter (API compatible con OpenAI), para cuando la app deje de ser
 * de uso estrictamente personal. Se activa automáticamente si hay
 * OPENROUTER_API_KEY y no hay ANTHROPIC_API_KEY — ver src/lib/ai/index.ts.
 */
export class OpenRouterProvider implements AIProvider {
  constructor(private apiKey: string) {}

  private async chat(body: Record<string, unknown>, model: string = MODEL): Promise<OpenRouterResponse> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, usage: { include: true }, ...body }),
    });
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  private async askForProposal(
    system: string,
    userContent: string,
    tier?: ReasoningTier
  ): Promise<WithUsage<AiIdeaProposal>> {
    const model = resolveModel(tier);
    const data = await this.chat(
      {
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `${userContent}\n\nResponde SOLO con JSON válido que cumpla el esquema AiIdeaProposal, sin texto adicional.`,
          },
        ],
        response_format: { type: "json_object" },
      },
      model
    );

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("La IA no devolvió contenido");
    return { result: extractJson(content) as AiIdeaProposal, usage: usageFrom(model, data) };
  }

  async structureIdea(input: StructureIdeaInput): Promise<WithUsage<AiIdeaProposal>> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.askForProposal(
      STRUCTURE_IDEA_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea:\n${input.rawText}`,
      input.tier
    );
  }

  async refineProposal(input: RefineProposalInput): Promise<WithUsage<AiIdeaProposal>> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.askForProposal(
      REFINE_PROPOSAL_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea original:\n${input.rawText}\n\nPropuesta actual:\n${JSON.stringify(input.currentProposal, null, 2)}\n\nFeedback del usuario para ajustar la propuesta:\n${input.feedback}`,
      input.tier
    );
  }

  async generateWeeklyReview(input: WeeklyReviewInput): Promise<WithUsage<string>> {
    const data = await this.chat({
      messages: [
        { role: "system", content: WEEKLY_REVIEW_SYSTEM },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
    });
    return { result: data.choices?.[0]?.message?.content ?? "", usage: usageFrom(MODEL, data) };
  }
}
