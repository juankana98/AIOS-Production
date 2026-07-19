---
tipo: dev-estado
actualizado: 2026-07-14
---

# Centro de Comando — Estado Actual

Snapshot vivo del proyecto. Esta página se **actualiza in-place** (no es cronológica) — para el historial de cómo se llegó hasta acá, ver [[Bitácora de cambios]]. Para el porqué de cada decisión, ver [[Decisiones de Arquitectura]]. Para lo que falta, ver [[Pendientes y Roadmap]].

## Qué es

Sistema personal de máxima productividad multi-empresa para Juan Camilo (Vetshipping, Restaurante, Automatización & Desarrollo). Contexto de producto completo en `CLAUDE.md` (raíz del repo).

## Infraestructura viva

| Pieza | Dónde |
|---|---|
| Código | GitHub: `juankana98/AIOS-Production` (rama `main`) |
| App en producción | https://aios-production.vercel.app |
| Hosting | Vercel (proyecto `aios-production`, Root Directory = `app/`) |
| Base de datos | Supabase (proyecto `bzdljthvtealvfvgstil`) — Postgres + Auth + RLS |
| IA | OpenRouter (billing por uso) |
| Vault (este) | `APP PRODUCTIVIDAD/vault/`, dentro del mismo repo |

Variables de entorno viven en `app/.env.local` (local, gitignored) y en Vercel (Production + Preview) — ver README para la lista completa.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 (componentes UI hand-rolled, sin shadcn) · Supabase (Postgres + Auth + RLS) · Server Actions (rutas API propias solo para OAuth: `/auth/callback` de Supabase y `/api/google/auth|callback`) · Recharts · @dnd-kit (calendario visual drag-and-drop en `/agenda`) · Anthropic SDK + fetch directo a OpenRouter · Google Calendar API (OAuth, FreeBusy).

## IA — proveedor y modelos activos

Proveedor activo: **OpenRouter** (`OPENROUTER_API_KEY` configurada; `ANTHROPIC_API_KEY` vacía a propósito — no existe forma soportada de usar la suscripción de Claude Code en un backend hospedado, ver [[Decisiones de Arquitectura#IA]]).

Selector de nivel de razonamiento en `/ideas` (`src/lib/ai/models.ts`), elegido por prueba empírica real (no solo specs), cruzando proveedores:

| Nivel | Modelo | Proveedor |
|---|---|---|
| Alto razonamiento | `openai/gpt-5.1` | OpenAI |
| Medio (default) | `x-ai/grok-4.20` | xAI |
| Rápido | `google/gemini-3.1-flash-lite` | Google |

Detalle de la comparación (incluyendo Opus 4.8 vs GPT-5.1 cabeza a cabeza) en [[Bitácora de cambios#2026-07-13 — Selector de nivel de razonamiento multi-proveedor]].

## Funcionalidades construidas

- CRUD completo: Empresas → Metas → OKRs/Key Results → Proyectos → KPIs/Tareas, **con edición inline** de proyectos y tareas (nombre, resultado esperado, estimación, energía, fechas — no solo creación/cambio de estado)
- Dashboard con % de avance agregado por empresa y global, más **panel de capacidad/desempeño del día**
- Control de tiempos: timer en vivo (uno activo a la vez), reporte semanal por proyecto
- Agenda inteligente: scoring de prioridad (Eisenhower + urgencia por deadline + energía) + generación automática de bloques de tiempo, **descontando reuniones reales de Google Calendar cuando está conectado**
- **Calendario visual** (`/agenda`): grid de horas con drag-and-drop (@dnd-kit) para reagendar bloques, reuniones de Google mostradas como capa de solo lectura
- **Conexión OAuth con Google Calendar**: lee disponibilidad real (FreeBusy API), botón conectar/desconectar en `/agenda`
- **Panel de capacidad/desempeño**: horario laboral real (menos reuniones) vs. tiempo ejecutado (`time_entries`) → % de "presión" visible en Dashboard, Agenda y Accountability
- Accountability: check-in diario, racha, semáforo de proyectos (verde/amarillo/rojo), resumen semanal generado por IA
- Agente de IA idea→estructura: propone proyecto/tareas/KPIs desde texto libre, con **iteración por feedback** (ajusta la propuesta existente en vez de regenerar desde cero) y selector de nivel de razonamiento
- Sync Supabase → Markdown (`obsidian-sync/`) hacia las carpetas `Empresas/`, `Proyectos/`, `OKRs/`, `Ideas/`, `Daily Notes/` de este vault
- Este vault, siguiendo el patrón LLM Wiki (ver `vault/CLAUDE.md`)

## Cuentas y accesos relevantes

- Supabase: cuenta de Juan Camilo, confirmación de email desactivada (uso personal, fricción mínima)
- GitHub: `juankana98`, push autenticado vía Git Credential Manager (token classic usado solo para el push inicial, luego revocable)
- Vercel: cuenta `juankana98`, ya autenticado en el CLI local

## Zona horaria

Todo el cálculo de "hoy" y horario laboral usa un offset fijo de Colombia (`-05:00`, sin horario de verano) definido en `src/lib/timezone.ts` — **nunca** usar `new Date().setHours(...)` ni parsear un `datetime-local` con `new Date(string)` directo en Server Actions, porque Vercel corre en UTC y desfasaría todo ~5 horas en producción (bug real encontrado y corregido el 2026-07-14, ver [[Bitácora de cambios]]). Usar `todayISO()`, `localDateTime()`, `localDateTimeFromInput()`.

## Última verificación end-to-end

2026-07-14: flujo completo probado con Playwright contra producción y local — signup → dashboard con siembra de empresas → proyecto → tarea → agenda automática → drag-and-drop en calendario visual → conexión real de Google Calendar (cuenta real del usuario, no mock) → panel de capacidad verificado contra la API de Google directamente → edición de proyecto y tarea. Sin errores de consola reales.
