---
tipo: dev-pendientes
actualizado: 2026-07-19
---

# Pendientes y Roadmap — Centro de Comando (AIOS)

Ver [[Estado Actual]] para qué ya existe. Esta página se actualiza in-place: mover a "Hecho" o borrar cuando se resuelve, no dejar acumular.

## Roadmap hacia SaaS (secuencia acordada con el usuario 2026-07-19)

1. [x] **Costos** — monitoreo de tokens/costo real por llamada de IA (`ai_usage_log`, página `/uso-ia`). Completado 2026-07-19.
2. [x] **Arquitectura de equipos/workspace** — todo lo que colgaba de `owner_id` (single-owner) ahora cuelga además de `workspace_id`, con RLS por membresía de equipo (owner/admin/member) y página `/equipo` para invitar/gestionar. Billing queda listo para ser por workspace, no por usuario. Completado 2026-07-19, ver [[Bitácora de cambios#2026-07-19 — Arquitectura de equipos/workspace (punto 2 del roadmap SaaS)]].
3. [ ] **Freemium + Onboarding** — gating de funciones de IA (y otros topes: empresas/proyectos/asientos, por decidir con datos reales de costo) para el plan gratuito; flujo de onboarding que levante rol/retos/objetivos del usuario nuevo. **No iniciado**, siguiente paso del roadmap.
4. [ ] **Landing page + registro público** — página de marketing y flujo de signup pulido para AIOS. **No iniciado**, se beneficia de tener pricing definido primero.

## Roadmap original (fases, ver `CLAUDE.md` raíz) — todas completadas para uso personal

- [x] Fase 0 — Scaffold
- [x] Fase 1 — CRUD esencial (con edición inline de tareas/proyectos)
- [x] Fase 2 — Priorización y agenda inteligente, con calendario visual drag-and-drop y Google Calendar real
- [x] Fase 3 — Control de tiempos
- [x] Fase 4 — OKRs y KPIs (CRUD y progreso; **falta**: gráficos de tendencia histórica, editar KPIs existentes)
- [x] Fase 5 — Agente de IA idea→estructura (iteración por feedback, selector de modelo)
- [x] Fase 6 — Motor de accountability, con panel de capacidad/desempeño real
- [x] Fase 7 — Vault LLM Wiki + sync
- [ ] Fase 8 — Multi-tenant → esto es literalmente el punto 2-3 del roadmap SaaS de arriba, ya no es "futuro lejano"

## Pendientes puntuales

- **Revocar el GitHub PAT classic** usado para el push inicial — se recomendó al usuario, no confirmado si ya lo hizo. Vercel usa su propia integración OAuth, no depende de ese token.
- **`generateWeeklyReview` no tiene selector de nivel de razonamiento** — usa el modelo "medium" por defecto sin poder elegir.
- **`vault/raw/` sigue vacío** — el patrón LLM Wiki para conocimiento de negocio externo todavía no se ha usado.
- **Sin tests automatizados** — toda la verificación fue manual con Playwright ad-hoc (`.tmp-e2e/`, descartado después de cada prueba). Vale la pena un puñado de tests de regresión permanentes si el ritmo se mantiene.
- **No hay gráfico de tendencia histórica de KPIs** pese a que `kpi_entries` ya acumula el histórico.
- **KPIs no se pueden editar** una vez creados (mismo gap que tenían tareas/proyectos antes, no resuelto para KPIs).
- **Tokens de Google Calendar sin cifrar at-rest** — razonable para uso personal, revisar antes de abrir a otros usuarios (punto 2 del roadmap SaaS).
- **Confirmar que la Authorized redirect URI de producción de Google está registrada** — probado en local, no verificado explícitamente en producción.
- **`ai_usage_log`/`daily_capacity` no tienen límite de retención** — crecerán indefinidamente; no urgente a este volumen, pero antes de Fase SaaS vale la pena decidir una política (ej. agregación mensual + purga de detalle viejo).
- **`getCurrentWorkspace()` es v1: un solo workspace por usuario** (toma la primera membresía por `created_at`). Si en algún momento se permite pertenecer a varios workspaces a la vez (ej. alguien que colabora en dos empresas), hace falta un selector de workspace activo (cookie/sesión) — hoy no existe.
- **La página `/equipo` no tiene UI para transferir ownership** ni para que un `member` se salga voluntariamente del workspace (la policy de RLS ya lo permite — `owner_or_self_can_delete_members` —, falta el botón).

## Ideas mencionadas en conversación, sin decidir todavía

- Topes exactos del plan freemium más allá de "sin IA" (número de empresas/proyectos/asientos) — el usuario confirmó que quiere topes adicionales pero no los específicos; se propusieron valores por defecto (1 empresa, 3 proyectos activos, 1 asiento) pendientes de validar con el usuario cuando se llegue al punto 3 del roadmap SaaS.
