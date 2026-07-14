export type ReasoningTier = "low" | "medium" | "high";

export type TierConfig = {
  label: string;
  description: string;
  /** Usado solo si ANTHROPIC_API_KEY está activa (AnthropicProvider no puede llamar otros proveedores). */
  anthropicModel: string;
  /** Usado por OpenRouterProvider — libre de elegir el mejor modelo de cualquier proveedor por nivel. */
  openrouterModel: string;
};

/**
 * Niveles de razonamiento seleccionables al estructurar/ajustar una idea.
 * Los modelos de "openrouterModel" se eligieron probando cada candidato con
 * el prompt real de estructuración (proyecto complejo + tarea suelta),
 * verificando JSON válido y comparando velocidad/costo — no son solo el
 * modelo más caro de cada proveedor. Ver conversación / log para el detalle
 * de la prueba. Cambiar aquí no requiere tocar ningún otro archivo.
 */
export const REASONING_TIERS: Record<ReasoningTier, TierConfig> = {
  low: {
    label: "Rápido",
    description: "Gemini 3.1 Flash Lite — ideas simples, una sola tarea clara (el más rápido y barato probado)",
    anthropicModel: "claude-haiku-4-5-20251001",
    openrouterModel: "google/gemini-3.1-flash-lite",
  },
  medium: {
    label: "Medio",
    description: "Grok 4.20 — default, mejor punto medio costo/calidad para la mayoría de ideas",
    anthropicModel: "claude-sonnet-5",
    openrouterModel: "x-ai/grok-4.20",
  },
  high: {
    label: "Alto razonamiento",
    description: "GPT-5.1 — proyectos de alto impacto, ambiguos o con muchas variables",
    anthropicModel: "claude-opus-4-8",
    openrouterModel: "openai/gpt-5.1",
  },
};

export const DEFAULT_TIER: ReasoningTier = "medium";
