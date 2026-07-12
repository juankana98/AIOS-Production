#!/usr/bin/env node
// Sync unidireccional: Supabase (fuente de verdad) → Markdown en el vault de Obsidian.
// El vault es de solo lectura respecto a este sistema: no se lee nada de vuelta.
// Uso: node sync.mjs  (o `npm run sync` dentro de esta carpeta)
//
// Variables de entorno requeridas (se cargan desde ../app/.env.local si existe):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (no la anon key — este script se salta RLS a propósito)
//   OBSIDIAN_VAULT_PATH

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", "app", ".env.local") });
loadEnv({ path: path.join(__dirname, ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Revisa app/.env.local.");
  process.exit(1);
}
if (!VAULT_PATH) {
  console.error("Falta OBSIDIAN_VAULT_PATH. Define la ruta absoluta del vault en app/.env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sanitizeFilename(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function toFrontmatter(obj) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - "${String(item).replace(/"/g, '\\"')}"`);
    } else if (typeof value === "string") {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeNote(relativeDir, filename, content) {
  const dir = path.join(VAULT_PATH, relativeDir);
  await ensureDir(dir);
  const filePath = path.join(dir, `${sanitizeFilename(filename)}.md`);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

// Solo agrega una línea al final de log.md — nunca reescribe el archivo.
// index.md, raw/, Entidades/, Conceptos/ y Fuentes/ son territorio del LLM
// cuando trabaja en el vault (ver vault/CLAUDE.md) y este script no los toca.
async function appendLog(summary) {
  const logPath = path.join(VAULT_PATH, "log.md");
  const dateStr = new Date().toISOString().slice(0, 10);
  const line = `\n## [${dateStr}] sync | ${summary}\n`;
  await fs.appendFile(logPath, line, "utf-8");
}

function progressBar(pct) {
  const filled = Math.round((pct / 100) * 20);
  return `${"█".repeat(filled)}${"░".repeat(20 - filled)} ${pct}%`;
}

async function syncCompanies(companies, projectsByCompany) {
  let count = 0;
  for (const company of companies) {
    const projects = projectsByCompany.get(company.id) ?? [];
    const avgProgress =
      projects.length === 0 ? 0 : Math.round(projects.reduce((s, p) => s + p.progress_pct, 0) / projects.length);

    const frontmatter = toFrontmatter({
      tipo: "empresa",
      id: company.id,
      color: company.color,
      progreso_pct: avgProgress,
      proyectos: projects.length,
      actualizado: new Date().toISOString(),
    });

    const body = [
      `# ${company.name}`,
      "",
      company.description ?? "",
      "",
      `**Avance promedio de proyectos:** ${progressBar(avgProgress)}`,
      "",
      "## Proyectos",
      ...projects.map((p) => `- [[${sanitizeFilename(`${company.name} - ${p.name}`)}]] — ${p.progress_pct}%`),
    ].join("\n");

    await writeNote("Empresas", company.name, frontmatter + body + "\n");
    count++;
  }
  return count;
}

async function syncOkrs(okrs, companyById) {
  let count = 0;
  for (const okr of okrs) {
    const company = companyById.get(okr.company_id);
    const frontmatter = toFrontmatter({
      tipo: "okr",
      id: okr.id,
      empresa: company?.name,
      estado: okr.status,
      actualizado: new Date().toISOString(),
    });

    const krLines = (okr.key_results ?? []).map((kr) => {
      const pct =
        kr.target_value === kr.start_value
          ? 0
          : Math.round(((kr.current_value - kr.start_value) / (kr.target_value - kr.start_value)) * 100);
      return `- **${kr.title}**: ${kr.current_value}/${kr.target_value} ${kr.metric_unit} — ${progressBar(Math.max(0, Math.min(100, pct)))}`;
    });

    const body = [
      `# ${okr.objective}`,
      "",
      company ? `Empresa: [[${sanitizeFilename(company.name)}]]` : "",
      "",
      okr.description ?? "",
      "",
      "## Key Results",
      ...krLines,
    ].join("\n");

    await writeNote("OKRs", `${company?.name ?? "Sin empresa"} - ${okr.objective}`, frontmatter + body + "\n");
    count++;
  }
  return count;
}

async function syncProjects(projects, companyById, tasksByProject, kpisByProject) {
  let count = 0;
  for (const project of projects) {
    const company = companyById.get(project.company_id);
    const tasks = tasksByProject.get(project.id) ?? [];
    const kpis = kpisByProject.get(project.id) ?? [];

    const frontmatter = toFrontmatter({
      tipo: "proyecto",
      id: project.id,
      empresa: company?.name,
      estado: project.status,
      prioridad: project.priority,
      progreso_pct: project.progress_pct,
      fecha_limite: project.due_on,
      actualizado: new Date().toISOString(),
    });

    const taskLines = tasks.map((t) => `- [${t.status === "done" ? "x" : " "}] ${t.title}`);
    const kpiLines = kpis.map(
      (k) => `- **${k.name}**: ${k.current_value}/${k.target_value} ${k.unit} (${k.frequency})`
    );

    const body = [
      `# ${project.name}`,
      "",
      company ? `Empresa: [[${sanitizeFilename(company.name)}]]` : "",
      "",
      `**Resultado esperado:** ${project.expected_outcome || "(sin definir)"}`,
      "",
      `**Avance:** ${progressBar(project.progress_pct)}`,
      "",
      "## KPIs",
      ...(kpiLines.length ? kpiLines : ["(sin KPIs)"]),
      "",
      "## Tareas",
      ...(taskLines.length ? taskLines : ["(sin tareas)"]),
    ].join("\n");

    await writeNote("Proyectos", `${company?.name ?? "Sin empresa"} - ${project.name}`, frontmatter + body + "\n");
    count++;
  }
  return count;
}

async function syncIdeas(ideas) {
  let count = 0;
  for (const idea of ideas) {
    const dateStr = idea.created_at.slice(0, 10);
    const title = idea.raw_text.slice(0, 60).replace(/\n/g, " ");

    const frontmatter = toFrontmatter({
      tipo: "idea",
      id: idea.id,
      estado: idea.status,
      creado: idea.created_at,
    });

    const proposalBlock = idea.ai_proposal
      ? [
          "## Propuesta de la IA",
          idea.ai_proposal.kind === "project" ? `Proyecto: ${idea.ai_proposal.project?.name}` : "Solo tareas",
          "",
          ...(idea.ai_proposal.tasks ?? []).map((t) => `- ${t.title}`),
        ].join("\n")
      : "";

    const body = [`# Idea: ${title}`, "", idea.raw_text, "", proposalBlock].join("\n");

    await writeNote("Ideas", `${dateStr} - ${title}`, frontmatter + body + "\n");
    count++;
  }
  return count;
}

async function syncDailyNotes(checkins) {
  let count = 0;
  for (const c of checkins) {
    const frontmatter = toFrontmatter({
      tipo: "daily-note",
      fecha: c.checkin_date,
      score: c.score,
    });

    const body = [
      `# ${c.checkin_date}`,
      "",
      "## Wins",
      c.wins || "(nada registrado)",
      "",
      "## Bloqueos",
      c.blockers || "(nada registrado)",
      "",
      "## Foco siguiente",
      c.focus_next || "(nada registrado)",
    ].join("\n");

    await writeNote("Daily Notes", c.checkin_date, frontmatter + body + "\n");
    count++;
  }
  return count;
}

async function main() {
  console.log(`→ Sincronizando hacia: ${VAULT_PATH}`);

  const [
    { data: companies, error: companiesError },
    { data: projects },
    { data: tasks },
    { data: kpis },
    { data: okrs },
    { data: ideas },
    { data: checkins },
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("is_archived", false),
    supabase.from("projects").select("*").neq("status", "cancelled"),
    supabase.from("tasks").select("*").neq("status", "cancelled"),
    supabase.from("kpis").select("*"),
    supabase.from("okrs").select("*, key_results(*)"),
    supabase.from("idea_inbox").select("*").neq("status", "discarded"),
    supabase.from("checkins").select("*").eq("type", "daily").order("checkin_date", { ascending: false }).limit(90),
  ]);

  if (companiesError) {
    console.error("Error leyendo Supabase:", companiesError.message);
    process.exit(1);
  }

  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));
  const projectsByCompany = new Map();
  for (const p of projects ?? []) {
    const list = projectsByCompany.get(p.company_id) ?? [];
    list.push(p);
    projectsByCompany.set(p.company_id, list);
  }
  const tasksByProject = new Map();
  for (const t of tasks ?? []) {
    const list = tasksByProject.get(t.project_id) ?? [];
    list.push(t);
    tasksByProject.set(t.project_id, list);
  }
  const kpisByProject = new Map();
  for (const k of kpis ?? []) {
    const list = kpisByProject.get(k.project_id) ?? [];
    list.push(k);
    kpisByProject.set(k.project_id, list);
  }

  const results = await Promise.all([
    syncCompanies(companies ?? [], projectsByCompany),
    syncOkrs(okrs ?? [], companyById),
    syncProjects(projects ?? [], companyById, tasksByProject, kpisByProject),
    syncIdeas(ideas ?? []),
    syncDailyNotes(checkins ?? []),
  ]);

  const summary = `Empresas: ${results[0]}, OKRs: ${results[1]}, Proyectos: ${results[2]}, Ideas: ${results[3]}, Daily Notes: ${results[4]}`;
  console.log(`✓ Sync completo — ${summary}`);
  await appendLog(summary);
}

main().catch((err) => {
  console.error("Sync falló:", err);
  process.exit(1);
});
