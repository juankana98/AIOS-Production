---
tipo: dev-pendientes
actualizado: 2026-07-13
---

# Pendientes y Roadmap — Centro de Comando

Ver [[Estado Actual]] para qué ya existe. Esta página se actualiza in-place: mover a "Hecho" o borrar cuando se resuelve, no dejar acumular.

## Roadmap original (fases, ver `CLAUDE.md` raíz)

- [x] Fase 0 — Scaffold
- [x] Fase 1 — CRUD esencial
- [x] Fase 2 — Priorización y agenda inteligente (scoring construido; **falta**: vista de calendario visual con drag-and-drop — hoy `/agenda` es una lista, no un calendario día/semana arrastrable pese a tener `@dnd-kit` instalado)
- [x] Fase 3 — Control de tiempos
- [x] Fase 4 — OKRs y KPIs (CRUD y progreso construidos; **falta**: gráficos de tendencia histórica de KPIs — `kpi_entries` ya guarda el histórico pero no hay chart que lo consuma todavía)
- [x] Fase 5 — Agente de IA idea→estructura (con iteración por feedback y selector de modelo)
- [x] Fase 6 — Motor de accountability
- [x] Fase 7 — Vault LLM Wiki + sync
- [ ] Fase 8 — Multi-tenant (OpenRouter ya está de base desde el día 1, lo cual adelanta este trabajo; falta: API keys por usuario, invitación, billing — no iniciado, no es prioridad mientras sea uso personal)

## Pendientes puntuales

- **Revocar el GitHub PAT classic** usado para el push inicial (ver [[Decisiones de Arquitectura#Infraestructura y despliegue]]) — se recomendó al usuario, no confirmado si ya lo hizo. Vercel usa su propia integración OAuth, no depende de ese token.
- **`generateWeeklyReview` no tiene selector de nivel de razonamiento** — usa el modelo "medium" por defecto (`grok-4.20`) sin poder elegir. Si el resumen semanal empieza a sentirse débil, vale la pena darle el mismo selector que `/ideas`.
- **`vault/raw/` sigue vacío** — el patrón LLM Wiki para conocimiento de negocio externo (no relacionado al desarrollo de la app) todavía no se ha usado. Pendiente de que el usuario ingiera su primera fuente real.
- **Sin tests automatizados** — toda la verificación hasta ahora fue manual con Playwright ad-hoc (scripts en `.tmp-e2e/`, descartados después de cada prueba). Si el ritmo de cambios se acelera, vale la pena un puñado de tests de regresión permanentes en vez de reconstruir el harness cada vez.
- **No hay gráfico de tendencia histórica de KPIs** pese a que `kpi_entries` ya acumula el histórico (Fase 4, ver arriba).
- **Agenda es lista, no calendario visual drag-and-drop** pese a tener `@dnd-kit` instalado (Fase 2, ver arriba).

## Ideas mencionadas en conversación, sin decidir todavía

(vacío por ahora — agregar acá cualquier idea que surja en conversación que no se vaya a implementar de inmediato, para no perderla)
