---
tipo: dev-bitacora
actualizado: 2026-07-14
---

# Bitácora de cambios — Centro de Comando

Cronológica y append-only — nunca reescribir entradas viejas, solo agregar al final. Formato de encabezado: `## YYYY-MM-DD — Título`. Ver también `log.md` (raíz del vault) para el registro corto de cada sync/ingest/lint; esta bitácora es la versión con detalle real para cambios de desarrollo.

## 2026-07-12 — Scaffold inicial completo

Construido de cero en una sola sesión: esquema SQL completo (12 tablas, RLS multi-tenant-ready), app Next.js 16 con CRUD de Empresas/Metas/OKRs/Proyectos/Tareas, control de tiempos, agenda inteligente con scoring de prioridad (Eisenhower + urgencia por deadline + energía), accountability (check-ins/racha/semáforo/resumen semanal por IA), agente de IA idea→estructura, y script de sync a un vault de Obsidian.

## 2026-07-12 — Vault reestructurado a patrón LLM Wiki

A mitad de la construcción, el usuario compartió el patrón "LLM Wiki" (raw/ + wiki mantenida activamente por el LLM + index.md/log.md) y pidió reestructurar el vault para seguirlo, moviéndolo además de una carpeta externa hacia dentro del repo (`APP PRODUCTIVIDAD/vault/`). Se creó `vault/CLAUDE.md` con las reglas de mantenimiento (ingest/query/lint) y la estructura `raw/`, `Entidades/`, `Conceptos/`, `Fuentes/`.

## 2026-07-12 — Supabase real conectado, migración aplicada, bugs de Next.js 16 encontrados y arreglados

El usuario proveyó credenciales reales de Supabase. Se corrió la migración vía SQL Editor (el usuario la ejecutó manualmente — no hay vía API para DDL con las claves anon/service_role). Se probó el flujo completo con Playwright contra el proyecto real y aparecieron dos bugs reales:
- Signup no redirigía al dashboard cuando la confirmación de email está desactivada (Supabase ya deja sesión iniciada en el `signUp`, pero la página se quedaba mostrando el formulario) — arreglado en `login/page.tsx`.
- `revalidatePath` inválido durante el render del Dashboard al sembrar las empresas por defecto — Next.js 16 lo prohíbe fuera de un Server Action disparado por formulario — arreglado en `actions/companies.ts` (se quitó la llamada, innecesaria porque el insert ocurre antes del fetch en el mismo render).

## 2026-07-12 — OpenRouter conectado, bug de JSON con code fences arreglado

El usuario proveyó una API key de OpenRouter (en vez de Anthropic directa). El agente de IA falló la primera vez: el modelo devolvía el JSON envuelto en \`\`\`json ... \`\`\` pese a pedir `response_format: json_object`. Se agregó extracción defensiva de code fences antes de `JSON.parse` en `openrouter-provider.ts`, y se reforzó el prompt con un ejemplo JSON literal (antes solo describía el esquema en prosa, lo que causaba que el modelo a veces omitiera `project.name`).

## 2026-07-12 — Git init, GitHub, Vercel conectados

Se inicializó git en la raíz del repo (no existía control de versiones hasta este punto — todo el trabajo previo estaba solo en disco). El usuario creó el repo en GitHub (`juankana98/AIOS-Production`) y proveyó un token classic para el push inicial. Se detectó que el token había quedado persistido en texto plano en `.git/config` (por usar `-u` con la URL tokenizada) y se corrigió de inmediato apuntando el branch de vuelta a `origin`. Para pushes futuros sin repetir el token, se guardó una sola vez en el Git Credential Manager de Windows.

## 2026-07-12 — Deploy a producción arreglado (faltaban env vars)

Primer deploy en Vercel devolvía 500 en toda la app. Causa: el proyecto de Vercel no tenía ninguna variable de entorno configurada (el Root Directory sí estaba bien apuntado a `app/`, el build compilaba). Se agregaron las 4 variables necesarias a Production y luego también a Preview (tras actualizar el CLI de Vercel de 53.3.1 a 55.0.0, que tenía un bug en el modo no-interactivo para el ambiente Preview).

## 2026-07-13 — Iteración con feedback en el agente de IA

Se agregó `AIProvider.refineProposal()`: ahora se puede dar feedback puntual sobre una propuesta ya generada ("quita esta tarea", "baja el piloto a 50 contactos") y la IA la ajusta quirúrgicamente en vez de regenerarla completa. De paso se encontró y arregló un bug real: la IA no conocía la escala exacta de prioridad del sistema (1=Crítica, 2=Alta, 3=Media, 4=Baja) y guardaba un número que a veces no coincidía con la palabra que usaba en su propio texto de rationale (decía "prioridad media" pero guardaba `priority=2`, que en el esquema es "Alta"). Se documentó la escala explícitamente en el prompt.

## 2026-07-13 — Selector de nivel de razonamiento multi-proveedor

El usuario pidió poder elegir el nivel de razonamiento (Alto/Medio/Bajo) al procesar una idea, y explícitamente que no se limitara a modelos de Anthropic — OpenRouter da acceso a todos los proveedores. Se probaron candidatos reales de OpenAI, Google, xAI y Anthropic con el prompt real de estructuración (un caso de proyecto complejo y uno de tarea suelta), verificando JSON válido, velocidad y costo — no solo specs de catálogo. `google/gemini-3-flash-preview` fue descartado por fallar generando JSON válido pese a precio atractivo.

Selección final: **Alto** = `openai/gpt-5.1`, **Medio** (default) = `x-ai/grok-4.20`, **Rápido** = `google/gemini-3.1-flash-lite`.

Después, a pedido del usuario, se hizo una comparación cabeza a cabeza específica entre Opus 4.8 y GPT-5.1 con una idea deliberadamente ambigua (asignación de recursos entre dos empresas con objetivos en tensión). Resultado sin ganador limpio: Opus produjo mejores KPIs pero calculó mal la fecha límite (`2025-08-01`, un año en el pasado respecto a la fecha actual — un bug real que rompería el semáforo de proyectos); GPT-5.1 calculó bien la fecha, agregó una tarea valiosa que Opus no consideró ("alinear al equipo con la decisión"), pero sus KPIs eran más débiles/vagos. GPT-5.1 además resultó ~1.6x más rápido y ~3.4x más barato. El usuario decidió dejar GPT-5.1 como está.

## 2026-07-13 — Vault activado como memoria de desarrollo del proyecto

El usuario pidió que Obsidian funcione como "memoria infinita de contexto" para la evolución de esta misma app — no solo para conocimiento de negocio externo. Se creó la carpeta `Desarrollo/` en el vault ([[Estado Actual]], [[Decisiones de Arquitectura]], esta bitácora, [[Pendientes y Roadmap]]) y se agregó la convención a `vault/CLAUDE.md` para que se mantenga actualizada en cada sesión futura de trabajo sobre el proyecto, no solo cuando se pida explícitamente.

## 2026-07-14 — Calendario visual + Google Calendar real + capacidad/desempeño + edición de tareas/proyectos

Pedido grande del usuario: calendario visual con drag-and-drop, conexión real con Google Calendar para detectar huecos libres, y un sistema que mida cuánto se puede avanzar por día para generar presión real sobre la ejecución. Se resolvió con OAuth completo (la otra opción, iCal secreto, se descartó por el usuario) — el usuario creó las credenciales en Google Cloud Console mientras se construía el resto.

Construido:
- **OAuth de Google Calendar** (`src/lib/google/`, `src/app/api/google/auth|callback`): scope de solo lectura (`calendar.readonly`), `access_type=offline` + `prompt=consent` para conseguir refresh_token, guardado en tabla nueva `google_calendar_connections` (RLS). Refresh automático del access_token cuando expira.
- **FreeBusy API** (no la API de eventos completa — no hace falta leer títulos/invitados, solo saber qué está ocupado) integrada al generador de agenda (`generateScheduleForDay` ahora descuenta reuniones reales, no solo bloques manuales) y a un nuevo módulo `src/lib/capacity.ts` que calcula capacidad real del día (horario laboral − reuniones) cruzada contra tiempo ejecutado (`time_entries`) → `CapacityPanel`, visible en Dashboard, Agenda y Accountability (las tres ubicaciones que pidió el usuario).
- **Calendario visual** (`VisualCalendar`, `@dnd-kit`): grid de horas 6:00-22:00, bloques de tareas arrastrables (snap de 15 min) vía `moveBlock`, reuniones de Google mostradas como capas no interactivas de solo lectura.
- **Edición de tareas y proyectos**: el usuario notó que una vez creados no se podían editar (ni nombre, ni estimación, ni objetivo). Se agregaron `updateTask` y `updateProject` (server actions) + `TaskListItem`/`EditProjectHeader` (toggle inline entre vista y formulario de edición, con botón de eliminar tarea incluido).

Bug real encontrado validando la integración (no en el código de Google Calendar, sino en un supuesto previo de toda la app): **el cálculo de "horario laboral" y "hoy" usaba la hora local del proceso Node** (`new Date().setHours(...)`), que es correcta en desarrollo local (el equipo está en `America/Bogota`) pero se rompe en producción porque Vercel corre las funciones serverless en UTC — habría desfasado el horario laboral ~5 horas y calculado "hoy" mal cerca de medianoche. Se creó `src/lib/timezone.ts` con un offset fijo de Colombia (`-05:00`, sin horario de verano) y se aplicó en `capacity.ts`, `schedule.ts` (agenda automática, bloques manuales), y el `due_at` de tareas. Verificado con un script que replica el cálculo de capacidad contra la cuenta real de Google del usuario: 2 reuniones reales detectadas hoy (1h c/u) → 9h de capacidad real vs. las 11h que asumía el horario fijo.

De paso se encontró que `.env.example` nunca había estado en git desde el primer commit — el `.gitignore` de Next.js por defecto (`.env*`) también lo excluía a él. Se corrigió con `!.env.example`.

Todo probado end-to-end con Playwright antes de subir (signup → crear proyecto/tarea → generar agenda → drag-and-drop → editar proyecto → editar tarea) y verificado con la cuenta real de Google Calendar del usuario, no solo con datos de prueba.

## 2026-07-19 — Fix: la agenda automática ignoraba la hora actual

El usuario reportó que "Generar agenda del día" siempre programaba las tareas empezando a las 8:00am, sin importar a qué hora del día se generara — si lo corrías a las 2pm, igual intentaba meter la primera tarea a las 8am (una hora que ya pasó). `generateScheduleForDay` construía la ventana de horario laboral completa (8-19h) sin considerar el momento real en que se está generando.

Fix en `src/actions/schedule.ts`: si `dateISO` corresponde a hoy, el inicio efectivo de la ventana se ajusta a `max(8am, ahora redondeado al siguiente slot de 15 min)` antes de calcular huecos libres. Para días futuros el comportamiento no cambia (usa el horario laboral completo). Si ya pasaron las 7pm al generar la agenda de hoy, no agenda nada (ventana vacía) en vez de fallar.

Verificado en vivo: generando a las 12:48pm, la primera tarea quedó agendada a la 1:00pm (siguiente slot de 15 min), no a las 8am.
