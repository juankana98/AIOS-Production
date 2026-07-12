import type { AIProvider } from "@/lib/ai/provider";
import { AnthropicProvider } from "@/lib/ai/anthropic-provider";
import { OpenRouterProvider } from "@/lib/ai/openrouter-provider";

let cached: AIProvider | null = null;

/**
 * Punto único de entrada al "cerebro" de IA. Fase 1 (solo yo): usa
 * ANTHROPIC_API_KEY. Fase 2 (multi-usuario): definir OPENROUTER_API_KEY y
 * quitar/dejar vacía ANTHROPIC_API_KEY para que el switch caiga a OpenRouter,
 * sin tocar ningún código que llame a getAIProvider().
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  if (process.env.ANTHROPIC_API_KEY) {
    cached = new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
    return cached;
  }
  if (process.env.OPENROUTER_API_KEY) {
    cached = new OpenRouterProvider(process.env.OPENROUTER_API_KEY);
    return cached;
  }
  throw new Error(
    "No hay proveedor de IA configurado. Define ANTHROPIC_API_KEY (fase personal) u OPENROUTER_API_KEY (fase multi-usuario) en .env.local"
  );
}
