---
tipo: dev-estado
actualizado: 2026-07-19
---

# Centro de Comando (AIOS) — Estado Actual

Snapshot vivo del proyecto. Esta página se **actualiza in-place** (no es cronológica) — para el historial de cómo se llegó hasta acá, ver [[Bitácora de cambios]]. Para el porqué de cada decisión, ver [[Decisiones de Arquitectura]]. Para lo que falta, ver [[Pendientes y Roadmap]].

## Qué es

Sistema de máxima productividad multi-empresa. **Fase actual: uso personal de Juan Camilo** (Vetshipping, Restaurante, Automatización & Desarrollo). **Fase siguiente (en marcha desde 2026-07-19): productizar como SaaS** bajo el nombre de marca **AIOS**, vendido por suscripción mensual (billing por workspace/equipo, freemium con topes en IA y otras cosas). Secuencia acordada: costos → equipos/workspace → freemium/onboarding → landing+registro. Contexto de producto completo en `CLAUDE.md` (raíz del repo).

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

## Diseño visual

Sistema de diseño "aqua/calma" definido 2026-07-19 (skill `ui-ux-pro-max`): paleta `teal`/`cyan` de Tailwind (sin tokens custom — `teal-700` primario), tipografía Poppins (headings, `font-heading`) + Inter (body), cards `rounded-2xl` con sombra teintada, fondo decorativo `.aqua-glow` (definido en `globals.css`, usado en login y layout principal). Badge tone `indigo` fue renombrado a `teal` — si agregas un componente nuevo, sigue esta paleta, no reintroduzcas `indigo-*`.

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
- **Monitoreo de costos de IA** (`/uso-ia`): cada llamada a `AIProvider` loguea proveedor/modelo/tokens/costo real en `ai_usage_log` — costo de hoy/semana/mes, proyección mensual, desglose por función/modelo. Base para fijar el precio de la membresía SaaS.
- **Arquitectura de equipos/workspace** (multi-tenant real, no solo single-owner): `workspaces`/`workspace_members`/`workspace_invitations`, RLS de las 15 tablas de negocio migrada de `owner_id` a membresía de workspace, auto-provisión de workspace personal al hacer signup (o unión automática si hay invitación pendiente). Página `/equipo`: listar miembros, invitar por correo (rama directa si ya tiene cuenta, invitación + email si es nuevo), cambiar rol, quitar miembro, cancelar invitación pendiente. Billing queda listo para ser por workspace, no por usuario.
- **Freemium + Onboarding**: workspaces nuevos (signup público, sin invitación) nacen en `plan = 'free'` — 1 empresa, 3 proyectos activos, 1 asiento, sin IA (`src/lib/plans.ts` + `src/lib/limits.ts`, enganchado en `createCompany`/`createProject`/`inviteMember`/las 3 llamadas de IA). El workspace `personal` de Juan Camilo queda sin topes. Wizard de onboarding obligatorio (`/onboarding`, 4 pasos: rol, negocio, reto, objetivo) antes de entrar al dashboard — crea la primera empresa del usuario con el nombre que dio. Panel de plan/uso visible en `/equipo` (barras de progreso por empresas/proyectos/asientos + badge de IA).

## Cuentas y accesos relevantes

- Supabase: cuenta de Juan Camilo, confirmación de email desactivada (uso personal, fricción mínima)
- GitHub: `juankana98`, push autenticado vía Git Credential Manager (token classic usado solo para el push inicial, luego revocable)
- Vercel: cuenta `juankana98`, ya autenticado en el CLI local

## Convención de formularios con Server Actions (importante — bug real ya encontrado dos veces)

**Nunca** pases a la prop `action` de un `<form>` una función cliente que envuelve una Server Action en `startTransition` (`<form action={(fd) => startTransition(async () => { await miAction(fd) })}>`). En este stack (Next.js 16.2.10 + React 19.2.4) ese patrón deja `isPending` colgado para siempre, tanto si la acción tiene éxito como si lanza error — el usuario ve el formulario deshabilitado indefinidamente y nunca aparece el mensaje de error. Encontrado el 2026-07-19 en 4 componentes (2 preexistentes: edición de tareas/proyectos; 2 nuevos: onboarding, invitar miembro). Dos patrones sí funcionan y son los que hay que seguir:
1. **Caso simple, un solo éxito posible (ej. onboarding)**: pasa la Server Action directo como `action` del `<form>` (`<form action={miServerAction}>`), sin wrapper cliente — deja que `redirect()` del lado del servidor haga la navegación, y usa `useFormStatus()` en un componente hijo para el estado "pending".
2. **Caso con manejo de error/estado en el cliente (la mayoría)**: usa `onSubmit` con `e.preventDefault()` + `new FormData(e.currentTarget)`, llamando a la Server Action manualmente dentro de `startTransition` — ver `src/components/ui/action-form.tsx` o `src/components/ideas/idea-actions.tsx` como referencia.

## Zona horaria

Todo el cálculo de "hoy" y horario laboral usa un offset fijo de Colombia (`-05:00`, sin horario de verano) definido en `src/lib/timezone.ts` — **nunca** usar `new Date().setHours(...)` ni parsear un `datetime-local` con `new Date(string)` directo en Server Actions, porque Vercel corre en UTC y desfasaría todo ~5 horas en producción (bug real encontrado y corregido el 2026-07-14, ver [[Bitácora de cambios]]). Usar `todayISO()`, `localDateTime()`, `localDateTimeFromInput()`.

## Última verificación end-to-end

2026-07-19: freemium + onboarding — signup nuevo real con Playwright: wizard de 4 pasos completado → primera empresa creada con el nombre dado → no se siembran las empresas demo → revisitar /onboarding ya completado redirige al dashboard → topes de empresas/proyectos/asientos bloqueados con el mensaje correcto → IA bloqueada → panel de plan en /equipo correcto. Cuenta real de Juan Camilo verificada como exenta (onboarding_completed_at ya seteado por el backfill, plan personal intacto). Usuarios y workspaces de prueba limpiados.

2026-07-19: arquitectura de equipos/workspace — migración de las 15 tablas de negocio a RLS por workspace verificada estructuralmente (0 nulos, 0 mismatches) y funcionalmente con Playwright (auto-creación de workspace en signup, CRUD bajo la RLS nueva, aislamiento cruzado real entre dos usuarios); flujo de invitación de equipo probado con tres usuarios reales (invitar existente, invitar nuevo, el nuevo se une automáticamente con el rol correcto). Todos los usuarios de prueba eliminados después.

2026-07-19: rediseño visual + monitoreo de costos probados con Playwright en light/dark mode (Dashboard, Proyectos, Agenda, Ideas, Uso & Costos) y flujo completo de IA de nuevo sin regresiones — llamada real registrada en `/uso-ia` con costo y tokens correctos. Sin errores de consola reales.

Verificación previa (2026-07-14): signup → dashboard con siembra de empresas → proyecto → tarea → agenda automática → drag-and-drop en calendario visual → conexión real de Google Calendar (cuenta real del usuario, no mock) → panel de capacidad verificado contra la API de Google directamente → edición de proyecto y tarea.
