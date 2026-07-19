# Centro de Comando

Sistema personal de máxima productividad multi-empresa: Empresas → Metas → OKRs → Proyectos → Tareas, con control de tiempos, agenda inteligente (time-blocking automático por prioridad), accountability (check-ins, rachas, semáforo, resumen semanal por IA), un agente de IA que convierte ideas sueltas en proyectos/tareas estructuradas, y un espejo de lectura en Obsidian.

Contexto completo de producto y decisiones de arquitectura: [`CLAUDE.md`](./CLAUDE.md).

## Estructura del repo

```
APP PRODUCTIVIDAD/
├── app/                  # Next.js (App Router) — la aplicación web
├── supabase/
│   └── migrations/       # Esquema SQL (Postgres + RLS)
├── obsidian-sync/        # Script Node que exporta Supabase → Markdown
└── CLAUDE.md
```

## 1. Levantar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito alcanza para uso personal).
2. En **Project Settings → API**, copia `Project URL`, `anon public key` y `service_role key`.
3. En **SQL Editor**, pega y ejecuta el contenido de `supabase/migrations/0001_init.sql`, y luego `0002_google_calendar.sql` (corre las migraciones en orden — cada archivo nuevo se pega y ejecuta por separado).
4. En **Authentication → Providers**, deja Email/Password habilitado (es lo que usa el login de la app). Si no quieres confirmación por correo mientras es solo para ti, desactiva "Confirm email" en Authentication → Settings.

## 2. Configurar la app

```bash
cd app
cp .env.example .env.local
# completa NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
npm install   # si no lo hiciste ya
npm run dev
```

Abre `http://localhost:3000`, crea tu cuenta (botón "¿Primera vez? Crea tu cuenta" en /login) y entra. Al primer ingreso, el dashboard siembra automáticamente las 3 empresas (Vetshipping, Restaurante, Automatización & Desarrollo) si no hay ninguna todavía.

### Sobre la IA

`ANTHROPIC_API_KEY` es la ruta soportada para el agente "idea → estructura" y el resumen semanal, con costo marginal en uso personal. **No existe una forma oficial de reutilizar la suscripción de Claude.ai/Claude Code dentro de un backend de terceros** — esa autenticación está atada al cliente oficial (CLI/apps de Anthropic), no a servicios hospedados propios. En la práctica esta app usa **OpenRouter** (`OPENROUTER_API_KEY`) desde el día 1 — da acceso a modelos de cualquier proveedor, no solo Anthropic. El selector de nivel de razonamiento en `/ideas` (Alto/Medio/Rápido) elige el modelo por nivel en `src/lib/ai/models.ts`.

### Sobre Google Calendar

Conexión OAuth de solo lectura para que la agenda descuente reuniones reales (no solo horario laboral fijo) y el panel de capacidad/desempeño sea honesto:

1. Ve a [console.cloud.google.com](https://console.cloud.google.com/) → crea un proyecto.
2. **APIs & Services → Library** → habilita **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**: User Type **External**, agrega el scope `.../auth/calendar.readonly`, y agrégate a ti mismo como **Test user** (en modo "Testing" no requiere verificación de Google).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, tipo **Web application**. Authorized redirect URIs — agrega las que vayas a usar:
   - `http://localhost:3000/api/google/callback`
   - `http://localhost:3001/api/google/callback` (por si el puerto 3000 está ocupado en desarrollo)
   - `https://<tu-dominio-de-vercel>/api/google/callback`
5. Copia `Client ID` y `Client secret` a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
6. Desde `/agenda` en la app, botón **Conectar Google Calendar**.

Sin esto configurado, la app sigue funcionando normal — el scheduler y el panel de capacidad caen a un horario laboral fijo (8:00–19:00) como fallback.

## 3. Vault de Obsidian (segundo cerebro)

El vault vive dentro del repo, en `vault/`. Ábrelo como vault en Obsidian (`Abrir carpeta como vault` → selecciona `APP PRODUCTIVIDAD/vault`).

Sigue el patrón **LLM Wiki** (ver `vault/CLAUDE.md` para las reglas completas):

- `vault/raw/` — fuentes crudas que tú agregas (artículos, notas, transcripciones). Nunca se editan.
- `vault/Entidades/`, `vault/Conceptos/`, `vault/Fuentes/` — la wiki real, mantenida por Claude Code: cuando le pidas "ingiere este archivo de raw/", crea/actualiza estas páginas con síntesis y referencias cruzadas.
- `vault/index.md` — catálogo de todo el vault. `vault/log.md` — historial cronológico de ingestas/queries/lints/syncs.
- `vault/Empresas/`, `vault/Proyectos/`, `vault/OKRs/`, `vault/Ideas/`, `vault/Daily Notes/` — espejo de solo lectura generado por `obsidian-sync/sync.mjs` desde Supabase. **No editar a mano.**

Para refrescar el espejo (Supabase → Markdown, de una sola vía):

```bash
cd obsidian-sync
npm install   # solo la primera vez
npm run sync
```

Corre este comando cuando quieras refrescar esas carpetas (manual por ahora; se puede programar con el Task Scheduler de Windows más adelante). El resto del vault (`raw/`, `Entidades/`, `Conceptos/`, `Fuentes/`) lo vas construyendo en conversación directa con Claude Code — no requiere ningún comando, solo pedirle que ingiera lo que dejaste en `raw/`.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · OpenRouter (multi-proveedor) · Google Calendar API (OAuth) · Recharts · @dnd-kit.

## Estado

En producción: `https://aios-production.vercel.app`. Estado detallado y bitácora completa de cambios en `vault/Desarrollo/` (ver `vault/Desarrollo/Estado Actual.md`) — ese vault es la fuente de verdad viva, este README solo cubre cómo levantar el proyecto desde cero.
