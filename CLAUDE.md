# CLAUDE.md

Contexto de proyecto para Claude Code. Léelo completo antes de trabajar en este repo.

## Qué es esto

**Centro de Comando** — sistema personal de máxima productividad para Juan Camilo, quien dirige simultáneamente varias unidades de negocio (Vetshipping, un restaurante, una unidad de automatización/desarrollo de herramientas digitales, y las que se sumen). El objetivo no es un gestor de tareas genérico: es un sistema de **accountability y velocidad de ejecución** al estilo de las operaciones más agresivas del mundo (referencia explícita: modelo operativo de Elon Musk — metas semanales exigentes, % de avance visible en todo momento, cero tolerancia a la parálisis).

Uso: **estrictamente personal por ahora.** Todo el diseño de auth/datos debe ser multi-tenant-ready (para poder abrir a otros usuarios más adelante) pero la Fase 1-N es de un solo usuario.

## Modelo mental del dominio

```
Empresa (Vetshipping, Restaurante, Automatización...)
 └─ Meta (objetivo anual/trimestral de la empresa)
     └─ OKR (Objective + Key Results, ligado a una Meta)
         └─ Proyecto (tiene resultado esperado, deadline, % avance, KPIs)
             └─ Tarea (prioridad, tiempo estimado/real, estado, fecha límite)
                 └─ TimeEntry (registro de tiempo trabajado en la tarea)
```

Entidades transversales:
- **IdeaInbox**: ideas sueltas que el usuario "tira" a la IA; la IA las estructura en Proyecto o Tarea(s).
- **ScheduleBlock**: bloques de agenda que asignan horas del día a tareas concretas, generados por el motor de priorización + ajustables a mano (estilo time-blocking).
- **CheckIn**: revisión diaria/semanal, rachas (streaks), estado semáforo (verde/amarillo/rojo) por proyecto según velocidad real vs. esperada.

## Decisiones de arquitectura (ya tomadas — no las cuestiones sin motivo nuevo)

| Decisión | Elección | Por qué |
|---|---|---|
| Tipo de app | Web app hospedada en la nube | Acceso desde el celular y cualquier dispositivo, no depende de tener el PC prendido |
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Velocidad de desarrollo, ecosistema maduro, despliegue directo en Vercel |
| Backend/DB | Supabase (Postgres + Auth + Realtime + Storage) | Postgres real con RLS listo para multi-tenant futuro, auth incluida, evita levantar backend propio |
| Hosting | Vercel (app) + Supabase Cloud (datos) | Cero DevOps propio |
| Relación con Obsidian | **Patrón "LLM Wiki"**: Supabase sigue siendo la fuente de verdad de los datos estructurados (empresas/proyectos/tareas/OKRs), pero el vault de Obsidian es un segundo cerebro real mantenido activamente por Claude Code, no solo un espejo estático | La app necesita queries rápidas y cálculos de % — eso vive en Supabase. Pero el "segundo cerebro" (artículos, research, notas de reuniones, ideas de negocio) necesita síntesis acumulativa entre fuentes, no solo backlinks — eso lo mantiene el agente de IA directamente en el vault, con `raw/` (fuentes crudas inmutables) + páginas de `Entidades/`/`Conceptos/`/`Fuentes/` que él escribe y actualiza + `index.md`/`log.md` de navegación. El espejo Supabase→Markdown (`obsidian-sync/sync.mjs`) sigue existiendo, pero es solo una de las carpetas del vault (`Empresas/`, `Proyectos/`, `OKRs/`, `Ideas/`, `Daily Notes/`), no el vault entero |
| Vault de Obsidian | Vive en `APP PRODUCTIVIDAD/vault/` (dentro del repo, no en una carpeta externa) | Así queda versionado junto con el resto del proyecto y es fácil de abrir como carpeta de trabajo tanto para Obsidian como para Claude Code. Estructura y convenciones completas en `vault/CLAUDE.md` |
| IA — Fase 1 (solo yo) | **Claude vía mi propia suscripción** (Claude Code / Claude Agent SDK con login OAuth de mi cuenta), sin facturación por token de API | Evita pagar API aparte mientras el uso es 100% personal. Ejecutado server-side, invocando Claude Code en modo no interactivo (`claude -p` / Agent SDK) autenticado con la cuenta del usuario |
| IA — Fase 2 (multi-usuario) | Cambiar a **OpenRouter** (o API de Anthropic con billing) cuando la app se abra a otras personas | La suscripción personal de Claude no puede reutilizarse para servir a terceros (limitación de cuenta/ToS); se necesita un proveedor con billing por uso una vez hay usuarios externos |
| Abstracción de IA | Interfaz `AIProvider` con métodos como `structureIdea()`, `suggestSchedule()`, `generateWeeklyReview()` | Permite cambiar de Claude-suscripción a OpenRouter sin tocar el código que la llama — un solo adapter nuevo |

## Funcionalidades core (roadmap por fases)

**Fase 0 — Base**
Scaffold del repo, proyecto Supabase, esquema de datos, auth, shell de Next.js.

**Fase 1 — CRUD esencial**
Empresas → Metas → OKRs → Proyectos → Tareas. Dashboard esqueleto con barras de % de avance por proyecto y por empresa.

**Fase 2 — Priorización y agenda inteligente**
Motor de scoring de prioridad (matriz Eisenhower + urgencia por deadline + duración estimada). Vista de calendario día/semana que auto-asigna horas libres a tareas según prioridad, con ajuste manual drag-and-drop (time blocking).

**Fase 3 — Control de tiempos**
Timer start/stop por tarea, tiempo estimado vs. real, reportes semanales de tiempo por empresa/proyecto.

**Fase 4 — OKRs y KPIs**
Progreso de Key Results, KPIs por proyecto con meta/actual/unidad/frecuencia, gráficos de tendencia histórica.

**Fase 5 — Agente de IA "idea → estructura"**
Input tipo chat donde el usuario tira una idea suelta; la IA decide si es Proyecto o Tarea(s), propone título, descripción, resultado esperado, desglose de tareas y KPIs sugeridos. El usuario aprueba/edita antes de confirmar (nunca se crea nada sin confirmación explícita en la fase inicial, salvo que se pida lo contrario).

**Fase 6 — Motor de accountability**
Check-in diario/semanal, rachas, resumen semanal autogenerado por IA, semáforo verde/amarillo/rojo por proyecto según velocidad real vs. objetivo.

**Fase 7 — Vault "LLM Wiki" + sync con Obsidian**
Dos piezas conviven en `vault/`: (1) `obsidian-sync/sync.mjs`, un script Node que lee Supabase y escribe/actualiza notas Markdown con frontmatter YAML en `Empresas/`, `Proyectos/`, `OKRs/`, `Ideas/`, `Daily Notes/` — de una sola vía (DB → Markdown), esas carpetas no son editables a mano; y (2) el resto del vault (`raw/`, `Entidades/`, `Conceptos/`, `Fuentes/`, `index.md`, `log.md`), que es una wiki real mantenida por Claude Code siguiendo el patrón "LLM Wiki": Juan Camilo deja fuentes crudas en `raw/`, le pide a Claude Code que las ingiera, y el agente crea/actualiza páginas de síntesis con referencias cruzadas — acumulando conocimiento en vez de re-derivarlo en cada pregunta. Reglas completas de mantenimiento en `vault/CLAUDE.md`.

**Fase 8 (futuro) — Multi-tenant**
Swap del proveedor de IA a OpenRouter, API keys por usuario, invitación de otras personas, billing.

## Principios de diseño no negociables

- **% y barra visual de avance en todo**: cada proyecto y cada empresa siempre muestra progreso cuantificado, nunca solo texto de estado.
- **Cero vanity metrics**: todo KPI debe ser accionable, no decorativo.
- **La agenda se genera a partir de las tareas reales del sistema**, no al revés — no hay "eventos" sueltos sin tarea asociada salvo bloqueos explícitos (reuniones, etc.).
- **Accountability agresivo**: el sistema debe empujar a avanzar, no solo registrar. Streaks, semáforos y resúmenes semanales deben incomodar cuando no hay avance real.
- **Esquema multi-tenant-ready desde el día 1** (FKs a `user_id`/`company_id`, RLS de Supabase activado) aunque el producto sea de un solo usuario por ahora — para no reescribir el modelo de datos cuando se abra a más gente.
- **La IA nunca reemplaza la revisión humana en la creación de estructura** salvo que el usuario pida explícitamente modo autónomo más adelante.

## Convenciones del repo

- Monorepo simple, sin workspaces: `app/` (Next.js), `supabase/migrations/` (SQL), `obsidian-sync/` (script Node aparte con su propio `package.json`).
- Gestor de paquetes: npm.
- Server Actions (`src/actions/*.ts`, `"use server"`) para todas las mutaciones — no hay capa de API REST propia salvo `src/app/auth/callback/route.ts` (OAuth de Supabase).
- Tipos de base de datos a mano en `src/lib/types.ts` (no hay proyecto Supabase real todavía para generar tipos con la CLI). Regenerar con `npx supabase gen types typescript` en cuanto exista el proyecto, conservando los alias (`CompanyRow`, `TaskRow`, etc.) que usa el resto del código.
- UI: componentes Tailwind hand-rolled en `src/components/ui/` (Button, Card, Badge, ProgressBar, Input/Textarea/Select) — no se instaló shadcn/ui todavía porque su CLI requiere init interactivo; son intercambiables por shadcn más adelante si se quiere.
- Next.js 16: `params`/`searchParams` son `Promise` (`await params`), el archivo de middleware se llama `src/proxy.ts` (no `middleware.ts`), Turbopack es el bundler por defecto.
- Todo dato de negocio cuelga de `owner_id = auth.uid()` con RLS activado (`supabase/migrations/0001_init.sql`) — multi-tenant-ready desde el día 1 aunque solo exista un usuario.
- El % de avance de un proyecto es automático por defecto (`progress_mode = 'auto'`, recalculado en `src/actions/tasks.ts` cada vez que cambia el estado de una tarea) — se puede pasar a manual con `setProjectManualProgress`.
- El motor de IA vive detrás de la interfaz `AIProvider` (`src/lib/ai/provider.ts`); el switch de proveedor por variables de entorno está en `src/lib/ai/index.ts`. Ver la nota de la sección de IA sobre por qué la Fase 1 usa API key de Anthropic y no la suscripción de Claude Code.
- Instrucciones completas de setup (Supabase, variables de entorno, sync a Obsidian) están en `README.md`.

## Estado actual

Scaffold funcional de las Fases 0-7 completado (2026-07-12): esquema SQL completo, auth, CRUD de Empresas/Metas/OKRs/Proyectos/Tareas, control de tiempos, agenda inteligente con scoring de prioridad, accountability (check-ins/rachas/semáforo/resumen semanal por IA), agente de IA idea→estructura, y script de sync a Obsidian con vault inicial ya creado en `C:\Users\57302\Desktop\IA JUAN CAMILO\Obsidian Centro de Comando\`.

Pendiente antes de uso real: crear el proyecto de Supabase en la nube y correr la migración, completar `app/.env.local`, probar el flujo completo con datos reales, desplegar a Vercel. Ninguno de estos pasos requiere rediseñar nada — es solo provisión de infraestructura y pruebas.
