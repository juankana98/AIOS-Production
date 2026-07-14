---
tipo: dev-decisiones
actualizado: 2026-07-13
---

# Decisiones de Arquitectura — Centro de Comando

Cada decisión con su porqué. Ver [[Estado Actual]] para el snapshot vivo, [[Bitácora de cambios]] para cuándo se tomó cada una.

## Stack general

- **Next.js (App Router) + Supabase**, no backend propio. Justificación: velocidad de desarrollo para un producto de un solo usuario, Postgres real con RLS listo para multi-tenant futuro, auth incluida.
- **Server Actions en vez de API REST propia.** Todas las mutaciones (`src/actions/*.ts`) son Server Actions con `"use server"`. Única excepción: `/auth/callback` (requerido por el flujo OAuth de Supabase). Menos código, menos superficie.
- **UI hand-rolled con Tailwind, no shadcn/ui.** El CLI de shadcn requiere init interactivo que no es viable en una sesión no-interactiva de agente. Se construyeron primitivas propias (`Button`, `Card`, `Badge`, `ProgressBar`, `Input`/`Textarea`/`Select`) — intercambiables por shadcn más adelante si se quiere, sin bloquear el desarrollo inicial.
- **Monorepo simple sin workspaces**: `app/` (Next.js), `supabase/migrations/` (SQL), `obsidian-sync/` (script Node con su propio `package.json`), `vault/` (este vault). Cada pieza es independiente; no hay necesidad de Turborepo/pnpm workspaces para 3 piezas.
- **Esquema multi-tenant-ready desde el día 1**: todo cuelga de `owner_id = auth.uid()` con RLS activado, aunque el producto sea de un solo usuario. Evita reescribir el modelo de datos si se abre a más gente (Fase 8, no iniciada).

## IA

- **Fase 1 (uso personal): OpenRouter, no Anthropic API directa, no suscripción de Claude Code.** Se investigó explícitamente si se podía usar la suscripción personal de Claude Code/Claude.ai dentro del backend de la app — **no existe una vía soportada**: esa autenticación está atada al cliente oficial (CLI/apps de Anthropic), no a servicios de terceros hospedados. La alternativa viable es una API key de pago por uso. Entre Anthropic API directa y OpenRouter, se optó por **OpenRouter desde el día 1** (decisión del usuario) — esto además adelanta gran parte del trabajo de la Fase 8 (multi-proveedor), ya que OpenRouter es el mismo mecanismo que se usaría al abrir la app a otros usuarios.
- **Interfaz `AIProvider` abstracta** (`src/lib/ai/provider.ts`) con dos implementaciones (`AnthropicProvider`, `OpenRouterProvider`), seleccionadas automáticamente en `src/lib/ai/index.ts` según qué env var esté presente. Cambiar de proveedor no toca código que lo llama.
- **Selector de nivel de razonamiento multi-proveedor** (`src/lib/ai/models.ts`): en vez de un modelo fijo, tres niveles (Alto/Medio/Rápido) cada uno mapeado al modelo más eficiente disponible en OpenRouter — cruzando proveedores (OpenAI, xAI, Google), no solo Anthropic. La elección de qué modelo va en cada nivel se hizo **probando empíricamente** cada candidato con el prompt real de la app (no solo comparando specs/precio de catálogo) — ver detalle y resultados de las pruebas en [[Bitácora de cambios]]. Se descartó un modelo (Gemini 3 Flash Preview) que fallaba generando JSON válido pese a verse bien en papel — la lección: **nunca confiar en specs de catálogo sin probar el caso de uso real.**
- **Iteración con feedback en vez de solo regenerar.** El agente de IA idea→estructura originalmente solo podía regenerar desde cero o aplicar tal cual. Se agregó `AIProvider.refineProposal()`: el usuario da feedback puntual ("quita esta tarea", "baja el piloto a 50") y la IA ajusta quirúrgicamente la propuesta existente en vez de rehacerla completa — con su propio prompt de refinamiento que instruye explícitamente "parte de la propuesta actual y aplica solo lo que pide el feedback".

## Obsidian / vault (este mismo sistema)

- **Patrón "LLM Wiki", no solo espejo estático.** Decisión tomada a mitad de la construcción (el usuario compartió el patrón explícitamente): el vault no es solo un destino de export automático de Supabase — tiene una capa `raw/` (fuentes crudas) + páginas que el agente mantiene activamente (`Entidades/`, `Conceptos/`, `Fuentes/`, y esta misma carpeta `Desarrollo/`) con síntesis acumulativa, no solo backlinks. Reglas operativas completas en `vault/CLAUDE.md`.
- **El vault vive dentro del repo** (`APP PRODUCTIVIDAD/vault/`), no en una carpeta externa — queda versionado en git junto con el código, y es fácil de abrir como carpeta de trabajo tanto para Obsidian como para Claude Code.
- **Esta carpeta `Desarrollo/` existe porque el usuario pidió explícitamente que Obsidian funcione como "memoria infinita de contexto" para la evolución de la app misma** — no solo para conocimiento de negocio externo ingerido. Se mantiene igual que el resto del wiki: [[Estado Actual]] se actualiza in-place, [[Bitácora de cambios]] es cronológica y append-only.

## Infraestructura y despliegue

- **Git Credential Manager en vez de token en texto plano.** El primer push usó un GitHub PAT classic pasado directamente en la URL; se detectó que había quedado persistido en texto plano en `.git/config` y se corrigió de inmediato. Para pushes futuros, el token se guardó una sola vez en el Credential Manager de Windows (cifrado por el SO) vía `git credential approve` — `.git/config` queda limpio, sin secretos.
- **Vercel con Root Directory = `app/`.** Es un monorepo; el primer 500 en producción fue simplemente que faltaban las variables de entorno (nunca se habían configurado en el proyecto de Vercel) — no un bug de código. Se agregaron a Production y Preview vía `vercel env add`.
