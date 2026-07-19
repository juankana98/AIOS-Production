---
tipo: dev-bitacora
actualizado: 2026-07-19 (freemium+onboarding)
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

## 2026-07-19 — Arranca la fase SaaS: monitoreo de costos de IA + rediseño visual completo

El usuario planteó el objetivo de negocio explícito: el sistema debe funcionar primero para uso personal, pero la intención es venderlo después como SaaS por suscripción mensual (landing page, registro, onboarding con levantamiento de perfil de usuario, equipos de trabajo, freemium sin IA). Dado que el modelo de datos actual es 100% single-owner y tocar eso mal habría significado rehacer trabajo caro, se acordó una secuencia con el usuario antes de escribir código: **costos primero → arquitectura de equipos/workspace → freemium/onboarding → landing+registro**. Decisiones confirmadas: billing por workspace/equipo (estilo Slack, no por usuario individual), freemium con tope en IA *y* en otras cosas (empresas/proyectos/asientos — no solo "sin IA"), nombre de marca de cara al público: **AIOS** (se adoptó el nombre que ya estaba en el slug de Vercel).

Esta entrada cubre la primera pieza de esa secuencia (monitoreo de costos) más un pedido en paralelo del usuario (rediseño visual) que no formaba parte del plan SaaS pero se atendió en la misma sesión.

### Monitoreo de tokens/costo de IA
Necesario para poder fijar el precio de la membresía con datos reales, no una corazonada. Se instrumentó `AIProvider` para que cada método (`structureIdea`, `refineProposal`, `generateWeeklyReview`) devuelva `{ result, usage }` en vez de solo el resultado — `usage` trae proveedor, modelo, tokens de entrada/salida y costo en USD:
- **OpenRouter** (el proveedor activo) ya devuelve el costo real calculado por ellos mismos en `usage.cost` — no hay que estimarlo.
- **Anthropic directo** no devuelve costo, así que se armó una tabla de precios propia por modelo (`ANTHROPIC_PRICING_PER_MILLION` en `anthropic-provider.ts`), usando los mismos precios verificados en el catálogo de OpenRouter.

Cada llamada se loguea en la tabla nueva `ai_usage_log` (RLS, non-blocking igual que `daily_capacity` — un fallo de logging nunca debe tumbar la función real) desde las server actions (`ideas.ts`, `reports.ts`). Nueva página `/uso-ia` — "Uso & Costos" — muestra costo de hoy/7 días/mes, proyección mensual extrapolada, desglose por función y por modelo, y el detalle de las últimas llamadas. Verificado en vivo con una llamada real: $0.0028, 1589 tokens, modelo `x-ai/grok-4.20`, nivel `medium` — el número apareció correcto en el dashboard de costos en segundos.

### Rediseño visual completo (pedido en paralelo)
El usuario describió el diseño anterior como "muy básico, plano, no estético" y pidió algo elegante con un efecto "tranquilo, tipo agua". Se usó el skill `ui-ux-pro-max` para generar un sistema de diseño en vez de improvisar colores:
- **Paleta**: teal/aqua (`teal-700` #0f766e primario, `teal-500`/`cyan-400` para acentos, fondo `teal-50` muy claro con toques cyan) — literalmente los valores por defecto de la escala `teal`/`cyan` de Tailwind, así que no hizo falta registrar tokens de color custom, solo reemplazar `indigo-*` por `teal-*` en todo el código (barrido automatizado + ajuste manual en los componentes de mayor visibilidad).
- **Tipografía**: Poppins (headings, vía `next/font/google`) + Inter (body, mejor soporte de `tabular-nums` para los números de dinero/tiempo/% que aparecen por toda la app) — reemplazó a Geist Sans/Mono.
- **Estilo**: cards `rounded-2xl` con sombra suave teintada (no gris plano), sidebar con blur/glass y branding nuevo ("AIOS" + ícono de olas), fondo decorativo `.aqua-glow` (dos manchas radiales aqua/cyan muy sutiles, solo en login y layout principal) para el efecto "agua en calma" sin volverse ruidoso.
- Semántica de color (verde/ámbar/rojo del semáforo y estados) se mantuvo intacta — solo cambió el acento de marca, no el significado de los indicadores.

Verificado visualmente con Playwright en light y dark mode, en Dashboard/Proyectos/Agenda/Ideas/Uso & Costos, y funcionalmente probando el flujo completo de IA de nuevo (sin regresiones). Sin errores de consola reales.

## 2026-07-19 — Arquitectura de equipos/workspace (punto 2 del roadmap SaaS)

Segunda pieza de la secuencia SaaS acordada (ver entrada anterior): migrar el modelo de datos de single-owner (`owner_id = auth.uid()`) a multi-tenant real por equipo, con billing por workspace en vez de por usuario individual — la pieza más grande y de mayor riesgo de todo el roadmap, porque toca RLS de las 15 tablas de negocio a la vez.

### Esquema (`supabase/migrations/0004_workspaces.sql`)

Tablas nuevas: `workspaces` (id/name/slug/plan), `workspace_members` (workspace_id, user_id, role: owner/admin/member), `workspace_invitations` (email, role, token, expira a 14 días). Funciones helper `SECURITY DEFINER` (`current_user_workspace_ids()`, `current_user_role_in()`) para que las policies de RLS puedan consultar la membresía del usuario sin recursión. `default_workspace_id()` se usa como `DEFAULT` de la columna `workspace_id` en cada tabla de negocio — truco clave para que el código de la app existente (que inserta filas sin pasar `workspace_id` explícito) siguiera funcionando sin tocar una sola server action.

Auto-provisión: trigger `on_auth_user_created` (`handle_new_user()`) en `auth.users` — todo usuario nuevo recibe un workspace personal automáticamente, **salvo** que tenga una invitación pendiente esperándolo (en ese caso se une a ese workspace con el rol de la invitación en vez de crear uno propio).

Migración de datos existentes: loop dinámico sobre las 15 tablas de negocio (`companies`, `goals`, `okrs`, `key_results`, `projects`, `kpis`, `kpi_entries`, `tasks`, `time_entries`, `schedule_blocks`, `checkins`, `idea_inbox`, `google_calendar_connections`, `daily_capacity`, `ai_usage_log`) — agrega `workspace_id`, backfillea desde `owner_id` vía `workspace_members`, la vuelve `NOT NULL`, y reemplaza la policy `owner_full_access` por `workspace_member_access` (acceso completo a cualquier fila cuyo `workspace_id` esté entre los workspaces del usuario actual).

**Verificación exhaustiva antes de dar la migración por buena** (el usuario la corrió manualmente vía SQL Editor, sin acceso a psql/DDL desde el agente):
1. Chequeo estructural vía REST: las 15 tablas con 0 filas `workspace_id IS NULL` y 0 mismatches contra `workspace_members`.
2. Prueba funcional con Playwright y dos usuarios reales nuevos: (a) el trigger crea el workspace automáticamente al hacer signup, (b) CRUD completo (empresa→proyecto→tarea) funciona bajo la RLS nueva sin tocar código, (c) **aislamiento cruzado real** — Usuario B no puede ver ni el proyecto ni las empresas sembradas de Usuario A, cada uno en su propio workspace.

### Página de Equipo (`/equipo`)

`src/lib/supabase/admin.ts` — cliente con `service_role` key, server-only, para operaciones que la anon key no puede hacer (leer `auth.users`, invitar usuarios). `src/lib/workspace.ts` — `getCurrentWorkspace()`, v1 asume un workspace por usuario (toma la primera membresía). `src/actions/workspace.ts` — `getWorkspaceTeamData()`, `inviteMember()`, `removeMember()`, `updateMemberRole()`, `cancelInvitation()`.

Lógica de invitación con dos ramas: si el correo ya tiene cuenta en Supabase, se agrega directo a `workspace_members` (sin fricción); si es nuevo, se inserta la fila en `workspace_invitations` y se llama a `admin.auth.admin.inviteUserByEmail()`. **Hallazgo importante**: esa llamada de la Admin API crea la fila en `auth.users` de inmediato (no espera a que la persona acepte el correo), lo que dispara `handle_new_user()` en el acto — la invitación se consume y la persona queda en `workspace_members` con el rol correcto *antes* de que llegue a hacer click en el correo. Confirmado con Playwright: invitado con rol "admin", y al "registrarse" con ese mismo correo ya aparecía como miembro con el rol correcto, sin invitación pendiente residual.

### Bug encontrado al limpiar los usuarios de prueba (y arreglado)

`workspace_invitations.invited_by` no tenía `on delete cascade` hacia `auth.users` (a diferencia de todos los demás `owner_id` del esquema, que sí lo tienen) — borrar una cuenta que hubiera invitado a alguien fallaba por violación de FK. Se hubiera manifestado en producción el día que un owner intentara borrar su cuenta después de haber invitado gente. Arreglado en `supabase/migrations/0005_workspace_invitations_fk_fix.sql` (cambia la constraint a `on delete cascade`).

## 2026-07-19 — Freemium + Onboarding (punto 3 del roadmap SaaS)

Tercera pieza del roadmap SaaS acordado: topes del plan gratuito (empresas/proyectos/asientos + sin IA) y wizard de onboarding que levanta rol/tipo de negocio/reto/objetivo del usuario nuevo.

### Esquema y plan por defecto (`supabase/migrations/0006_plans_and_onboarding.sql`)

`handle_new_user()` (el trigger de auto-provisión de workspace en signup) se modificó para que el workspace de un usuario nuevo **sin invitación pendiente** nazca en `plan = 'free'` en vez de heredar el default de columna `'personal'`. El plan `personal` queda reservado para el workspace que ya existía antes de este cambio (uso interno de Juan Camilo) — no se toca. Tabla nueva `user_profiles` (por usuario, no por workspace, porque cada persona invitada a un workspace compartido completa su propio onboarding): `role`, `business_type`, `main_challenge`, `main_goal`, `onboarding_completed_at`. Backfill: todo usuario que ya existiera antes de esta migración queda con `onboarding_completed_at = now()` para no interrumpirlo con el wizard — verificado explícitamente contra la cuenta real de Juan Camilo después de aplicar la migración (`onboarding_completed_at` seteado, plan `personal` intacto).

### Topes del plan Free

Confirmados con el usuario antes de construir: **1 empresa, 3 proyectos activos, 1 asiento, sin IA**. Config centralizada en `src/lib/plans.ts` (`PLAN_LIMITS` por plan: `personal`/`free`/`pro`/`team`, `null` = sin tope) y enforcement en `src/lib/limits.ts` (`assertCanCreateCompany`, `assertCanCreateProject`, `assertCanInviteMember`, `assertAiEnabled` — cada uno resuelve el workspace actual, calcula el uso real vía `count` de Supabase, y lanza un `Error` con mensaje accionable si se pasa del tope). Enganchado en `createCompany`, `createProject`, `inviteMember` y los tres puntos de entrada de IA (`processIdea`, `refineIdeaProposal`, `generateWeeklyReview`). `seedDefaultCompaniesIfEmpty` (que sembraba Vetshipping/Restaurante/Automatización) ahora solo corre para workspaces `plan = 'personal'` — un workspace Free nuevo arranca vacío, y el onboarding crea su primera (única) empresa real con el nombre que el usuario dio.

Panel de plan visible en `/equipo`: nombre del plan, badge "Sin IA"/"IA incluida", y barra de progreso por empresas/proyectos/asientos usados vs. tope — para que la presión de upgrade sea visible, no solo un error al chocar contra el límite.

### Wizard de onboarding (`/onboarding`, 4 pasos, obligatorio)

Rol → tipo de negocio + nombre del negocio → mayor reto → objetivo con la herramienta. Bloquea el dashboard hasta completarse (gate en `src/proxy.ts`: si el usuario está autenticado y no tiene `user_profiles.onboarding_completed_at`, se redirige a `/onboarding`; si ya lo completó y visita `/onboarding` de nuevo, se redirige de vuelta al dashboard). Al terminar, `completeOnboarding` (`src/actions/onboarding.ts`) guarda el perfil y crea la primera empresa del workspace con el nombre dado en el paso 2.

### Bug sistémico encontrado y arreglado: `<form action={(formData) => startTransition(...)}>` no resuelve

Mientras se probaba el wizard con Playwright, el paso final se quedaba colgado indefinidamente en "Guardando..." — el servidor completaba la Server Action correctamente (200 en los logs) pero el cliente nunca navegaba. Investigando más a fondo (con `page.on("requestfinished")` para inspeccionar la respuesta real en el navegador) apareció el mismo síntoma en los formularios de crear empresa/proyecto e invitar miembro, pero ahí manifestado como que el mensaje de error de tope de plan nunca se mostraba pese a que el servidor sí lanzaba el error (confirmado en logs con status 500).

Causa raíz: el patrón `<form action={(formData) => startTransition(async () => { await miServerAction(formData); ... })}>` — pasarle a la prop `action` de un `<form>` una función cliente que internamente envuelve la Server Action en `startTransition` — deja el estado `isPending` colgado indefinidamente en este entorno (Next.js 16.2.10 + React 19.2.4), tanto cuando la acción resuelve bien como cuando lanza error. El patrón que sí funciona de forma confiable (ya usado y probado en `idea-actions.tsx` y `weekly-review.tsx`) es invocar la Server Action manualmente desde un `onClick`/`onSubmit` normal envuelto en `startTransition`, **sin** pasarla por la prop `action` del `<form>`.

Se encontraron y arreglaron **4 componentes** con el patrón roto (2 preexistentes de antes de esta sesión, no solo el código nuevo de hoy):
- `src/components/onboarding/onboarding-wizard.tsx` — reescrito para usar un `<form action={completeOnboarding}>` **nativo** (la Server Action directamente como target, sin wrapper cliente) con `redirect("/")` del lado del servidor — el patrón más simple y robusto para el caso de éxito único de este wizard. Estado de "pending" ahora vía `useFormStatus()` en un componente hijo (`SubmitButton`).
- `src/components/ui/action-form.tsx` (nuevo, de hoy) — reescrito de `action={fn}` a `onSubmit` con `e.preventDefault()` + `startTransition` manual.
- `src/components/equipo/invite-member-form.tsx` — mismo fix (`onSubmit` en vez de `action`).
- `src/components/tasks/edit-project-header.tsx` y `src/components/tasks/task-list-item.tsx` (**preexistentes**, de la Fase 1 de edición inline de tareas/proyectos) — tenían el mismo patrón roto. Esto significa que la edición de tareas/proyectos probablemente nunca mostró errores del servidor correctamente desde que se implementó (aunque el caso feliz sin errores parece haber funcionado en las pruebas previas, por eso no se detectó antes) — arreglado con el mismo cambio a `onSubmit`.

Verificado con Playwright de punta a punta con un usuario nuevo real: signup → redirige a onboarding → wizard completo → primera empresa creada con el nombre dado → NO se siembran las 3 empresas demo → revisitar `/onboarding` ya completado redirige al dashboard → crear 2da empresa bloqueada con el mensaje exacto del tope → 3 proyectos activos creados, 4to bloqueado → intentar usar IA bloqueado → panel de plan en `/equipo` muestra "Free"/"Sin IA"/1-1-3-3-1-1 correctamente → invitar 2do miembro bloqueado por tope de asiento. Los 9 checks pasaron. Usuarios y workspaces de prueba (de esta sesión y de la sesión anterior de equipos) limpiados vía Admin API.
