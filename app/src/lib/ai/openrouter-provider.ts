import type { AIProvider, RefineProposalInput, StructureIdeaInput, WeeklyReviewInput } from "@/lib/ai/provider";
import { REFINE_PROPOSAL_SYSTEM, STRUCTURE_IDEA_SYSTEM, WEEKLY_REVIEW_SYSTEM } from "@/lib/ai/prompts";
import type { AiIdeaProposal } from "@/lib/types";

const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";

// Algunos modelos ignoran response_format:"json_object" y envuelven la
// respuesta en un bloque ```json ... ``` de todos modos — se limpia antes de parsear.
function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fenced ? fenced[1] : content);
}

/**
 * Fase 2 (multi-usuario): implementación equivalente a AnthropicProvider pero
 * vía OpenRouter (API compatible con OpenAI), para cuando la app deje de ser
 * de uso estrictamente personal. Se activa automáticamente si hay
 * OPENROUTER_API_KEY y no hay ANTHROPIC_API_KEY — ver src/lib/ai/index.ts.
 */
export class OpenRouterProvider implements AIProvider {
  constructor(private apiKey: string) {}

  private async chat(body: Record<string, unknown>) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, ...body }),
    });
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  private async askForProposal(system: string, userContent: string): Promise<AiIdeaProposal> {
    const data = await this.chat({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `${userContent}\n\nResponde SOLO con JSON válido que cumpla el esquema AiIdeaProposal, sin texto adicional.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("La IA no devolvió contenido");
    return extractJson(content) as AiIdeaProposal;
  }

  async structureIdea(input: StructureIdeaInput): Promise<AiIdeaProposal> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.askForProposal(
      STRUCTURE_IDEA_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea:\n${input.rawText}`
    );
  }

  async refineProposal(input: RefineProposalInput): Promise<AiIdeaProposal> {
    const companiesList = input.companies.map((c) => `- ${c.name} (slug: ${c.slug})`).join("\n");

    return this.askForProposal(
      REFINE_PROPOSAL_SYSTEM,
      `Empresas disponibles:\n${companiesList || "(ninguna registrada aún)"}\n\nIdea original:\n${input.rawText}\n\nPropuesta actual:\n${JSON.stringify(input.currentProposal, null, 2)}\n\nFeedback del usuario para ajustar la propuesta:\n${input.feedback}`
    );
  }

  async generateWeeklyReview(input: WeeklyReviewInput): Promise<string> {
    const data = await this.chat({
      messages: [
        { role: "system", content: WEEKLY_REVIEW_SYSTEM },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
    });
    return data.choices?.[0]?.message?.content ?? "";
  }
}
