# CLAUDE.md — Vault (LLM Wiki)

Este directorio es un vault de Obsidian que funciona como **segundo cerebro** de Juan Camilo, siguiendo el patrón "LLM Wiki": tú (el agente) mantienes una wiki markdown persistente y compuesta, no solo recuperas fragmentos por RAG en cada pregunta. Cuando trabajes dentro de `vault/`, sigue estas reglas.

## Las tres capas

1. **`raw/`** — fuentes crudas e inmutables (artículos, notas, transcripciones, PDFs convertidos, apuntes pegados). Tú lees de aquí, **nunca escribes ni modificas nada en `raw/`**. Es la fuente de verdad de los documentos originales.
2. **La wiki** (el resto del vault) — páginas markdown que tú creas y mantienes: resúmenes, páginas de entidades, páginas de conceptos, síntesis, comparaciones. Esta capa es tuya: la creas, la actualizas cuando llega información nueva, mantienes las referencias cruzadas y la consistencia. Juan Camilo la lee y navega; tú la escribes.
3. **Este archivo** — el schema. Se actualiza en conjunto con Juan Camilo a medida que se descubre qué funciona para este dominio.

## Carpetas de la wiki

- **`Empresas/`, `Proyectos/`, `OKRs/`, `Ideas/`, `Daily Notes/`** — **auto-generadas por `obsidian-sync/sync.mjs`** desde Supabase (la app Centro de Comando). Son un espejo de solo lectura de los datos estructurados de la app (empresas, metas, OKRs, proyectos, tareas, ideas, check-ins). **Nunca las edites a mano** — se sobreescriben en cada `npm run sync`. Trátalas como fuente de datos ya sintetizada que puedes enlazar desde tus propias páginas, pero no como algo que tú mantienes.
- **`Entidades/`** — páginas sobre personas, organizaciones externas, proveedores, competidores, herramientas, etc. que aparecen en las fuentes que Juan Camilo va ingiriendo. Una página por entidad, actualizada cada vez que una fuente nueva la menciona.
- **`Conceptos/`** — páginas de síntesis sobre temas/ideas que se repiten o evolucionan a través de varias fuentes (ej. una estrategia de negocio, un patrón de automatización, un modelo mental). Aquí es donde vive la síntesis acumulada, no solo un resumen de una fuente.
- **`Fuentes/`** — una página por cada documento en `raw/`: metadata, resumen, takeaways clave, y qué páginas de `Entidades/`/`Conceptos/` actualizó al ingerirla.
- **`index.md`** — catálogo de todo el contenido del vault, orientado a contenido (qué hay y dónde). Se actualiza en cada ingesta.
- **`log.md`** — registro cronológico append-only de qué se hizo y cuándo (ingestas, queries archivadas, lints).

## Operaciones

### Ingest (ingerir una fuente nueva)
Cuando Juan Camilo agregue un archivo a `raw/` y te pida procesarlo:
1. Léelo completo.
2. Conversa con él sobre los puntos clave si hace falta contexto de negocio.
3. Crea (o actualiza) la página correspondiente en `Fuentes/`.
4. Crea o actualiza las páginas de `Entidades/` y `Conceptos/` que la fuente toca — no te limites a resumir, integra: si contradice algo ya escrito, anótalo explícitamente en la página afectada en vez de sobreescribir en silencio.
5. Actualiza `index.md` con los links nuevos/cambiados.
6. Agrega una entrada a `log.md` con el formato de abajo.

Por defecto, ingiere fuentes de una en una y mantén a Juan Camilo involucrado (mostrale qué páginas tocaste). Si él pide un batch de varias fuentes sin supervisión, hazlo, pero dilo explícitamente al terminar.

### Query (responder preguntas contra la wiki)
Lee primero `index.md` para ubicar páginas relevantes, luego entra a esas páginas. Sintetiza con citas a las páginas fuente (`[[nombre de la página]]`). Si la respuesta vale la pena conservar (una comparación, un análisis, una conexión nueva), ofrece guardarla como página nueva en `Conceptos/` en vez de dejar que se pierda en el chat.

### Lint (mantenimiento periódico)
Cuando Juan Camilo lo pida ("revisa el vault", "haz lint del wiki"): busca contradicciones entre páginas, afirmaciones desactualizadas por fuentes más nuevas, páginas huérfanas sin enlaces entrantes, conceptos mencionados varias veces que todavía no tienen página propia, y huecos de información. Reporta hallazgos y proponé qué actualizar antes de tocar nada, salvo que Juan Camilo ya te haya dado autonomía para ese tipo de limpieza.

## Convenciones

- Frontmatter YAML mínimo en cada página de `Entidades/`/`Conceptos/`/`Fuentes/`: `tipo`, `creado`, `actualizado`, y `tags` si aplica.
- Enlaces internos con sintaxis `[[Nombre de la página]]` de Obsidian.
- `log.md`: cada entrada empieza con `## [YYYY-MM-DD] tipo | Título` donde `tipo` es `ingest`, `query`, `lint` o `sync` — esto permite `grep "^## \["` para ver el historial rápido.
- No dupliques contenido entre `Entidades/` y `Conceptos/`: una entidad es un "quién/qué" concreto (persona, empresa, herramienta); un concepto es una idea/patrón/tema que atraviesa varias fuentes o entidades.

## Relación con la app Centro de Comando

Este vault vive dentro del repo (`APP PRODUCTIVIDAD/vault/`), junto a `app/` (Next.js) y `obsidian-sync/` (el script de sync). Contexto completo del producto en `../CLAUDE.md` (raíz del repo). El sync Supabase → Markdown corre con `cd ../obsidian-sync && npm run sync` y solo toca las carpetas auto-generadas listadas arriba — nunca `raw/`, `Entidades/`, `Conceptos/`, `Fuentes/`, `index.md` (fuera de su propia sección) ni `log.md` (solo le agrega una línea al final).
