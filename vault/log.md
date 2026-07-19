# Log

Registro cronológico append-only. Formato de cada entrada: `## [YYYY-MM-DD] tipo | Título` (tipo: `ingest`, `query`, `lint`, `sync`, `dev`). Agrega entradas nuevas al final del archivo.

## [2026-07-12] sync | Vault creado con estructura LLM Wiki (raw/ + wiki + index/log) dentro de APP PRODUCTIVIDAD/vault

## [2026-07-12] sync | Empresas: 0, OKRs: 0, Proyectos: 0, Ideas: 0, Daily Notes: 0

## [2026-07-12] dev | Scaffold inicial completo (schema, app Next.js 16, vault) — detalle en Desarrollo/Bitácora de cambios.md

## [2026-07-12] dev | Supabase real conectado, migración aplicada, 2 bugs de Next.js 16 arreglados (signup redirect, revalidatePath en render)

## [2026-07-12] dev | OpenRouter conectado, bug de JSON con code fences arreglado

## [2026-07-12] dev | Git init + GitHub (juankana98/AIOS-Production) + Vercel conectados, credenciales aseguradas vía Credential Manager

## [2026-07-12] dev | Deploy a producción arreglado — faltaban env vars en Vercel

## [2026-07-13] dev | Iteración con feedback en el agente de IA + fix de escala de prioridad

## [2026-07-13] dev | Selector de nivel de razonamiento multi-proveedor (GPT-5.1/Grok 4.20/Gemini 3.1 Flash Lite), comparación Opus vs GPT-5.1

## [2026-07-13] dev | Carpeta Desarrollo/ creada en el vault como memoria de desarrollo del proyecto — ver Desarrollo/Estado Actual.md

## [2026-07-14] dev | Calendario visual + Google Calendar real + capacidad/desempeño + edición de tareas/proyectos + fix de zona horaria — ver Desarrollo/Bitácora de cambios.md

## [2026-07-19] dev | Fix: "Generar agenda del día" ignoraba la hora actual y agendaba desde las 8am aunque ya fuera medio día — ahora arranca desde ahora (redondeado a 15 min) cuando se genera la agenda de hoy

## [2026-07-19] dev | Arranca fase SaaS: monitoreo de costos de IA (ai_usage_log, /uso-ia) + rediseño visual completo (paleta aqua/teal, marca AIOS) — ver Desarrollo/Bitácora de cambios.md

## [2026-07-19] dev | Arquitectura de equipos/workspace (multi-tenant real, punto 2 del roadmap SaaS): RLS de 15 tablas migrada de owner_id a workspace, página /equipo, invitaciones — ver Desarrollo/Bitácora de cambios.md

## [2026-07-19] dev | Freemium + Onboarding (punto 3 del roadmap SaaS): plan Free con topes, wizard de 4 pasos obligatorio, y fix de un bug sistémico de formularios (form action={fn}+startTransition) que afectaba también edición de tareas/proyectos — ver Desarrollo/Bitácora de cambios.md
