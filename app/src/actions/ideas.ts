"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { REASONING_TIERS, type ReasoningTier } from "@/lib/ai/models";
import { logAiUsage } from "@/lib/ai/usage";
import type { AiIdeaProposal } from "@/lib/types";

function parseTier(tier: string | undefined): ReasoningTier | undefined {
  return tier && tier in REASONING_TIERS ? (tier as ReasoningTier) : undefined;
}

export async function createIdea(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const rawText = String(formData.get("raw_text") ?? "").trim();
  if (!rawText) throw new Error("Escribe la idea antes de enviarla");

  const { error } = await supabase.from("idea_inbox").insert({
    owner_id: user.id,
    raw_text: rawText,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/ideas");
}

export async function processIdea(ideaId: string, tier?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: idea } = await supabase.from("idea_inbox").select("raw_text").eq("id", ideaId).single();
  if (!idea) throw new Error("Idea no encontrada");

  const { data: companies } = await supabase.from("companies").select("id, name, slug").eq("is_archived", false);

  await supabase.from("idea_inbox").update({ status: "processing" }).eq("id", ideaId);

  try {
    const provider = getAIProvider();
    const parsedTier = parseTier(tier);
    const { result: proposal, usage } = await provider.structureIdea({
      rawText: idea.raw_text,
      companies: companies ?? [],
      tier: parsedTier,
    });
    await logAiUsage(supabase, user.id, "structure_idea", parsedTier, usage);

    await supabase
      .from("idea_inbox")
      .update({ status: "pending", ai_proposal: proposal })
      .eq("id", ideaId);
  } catch (err) {
    await supabase.from("idea_inbox").update({ status: "pending" }).eq("id", ideaId);
    throw err;
  }

  revalidatePath("/ideas");
}

export async function refineIdeaProposal(ideaId: string, feedback: string, tier?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const trimmedFeedback = feedback.trim();
  if (!trimmedFeedback) throw new Error("Escribe qué quieres ajustar antes de enviar");

  const { data: idea } = await supabase
    .from("idea_inbox")
    .select("raw_text, ai_proposal")
    .eq("id", ideaId)
    .single();
  if (!idea) throw new Error("Idea no encontrada");
  if (!idea.ai_proposal) throw new Error("Esta idea todavía no tiene una propuesta para ajustar");

  const { data: companies } = await supabase.from("companies").select("id, name, slug").eq("is_archived", false);

  await supabase.from("idea_inbox").update({ status: "processing" }).eq("id", ideaId);

  try {
    const provider = getAIProvider();
    const parsedTier = parseTier(tier);
    const { result: proposal, usage } = await provider.refineProposal({
      rawText: idea.raw_text,
      currentProposal: idea.ai_proposal as AiIdeaProposal,
      feedback: trimmedFeedback,
      companies: companies ?? [],
      tier: parsedTier,
    });
    await logAiUsage(supabase, user.id, "refine_proposal", parsedTier, usage);

    await supabase
      .from("idea_inbox")
      .update({ status: "pending", ai_proposal: proposal })
      .eq("id", ideaId);
  } catch (err) {
    await supabase.from("idea_inbox").update({ status: "pending" }).eq("id", ideaId);
    throw err;
  }

  revalidatePath("/ideas");
}

export async function applyIdeaProposal(ideaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: idea } = await supabase
    .from("idea_inbox")
    .select("ai_proposal, company_id")
    .eq("id", ideaId)
    .single();
  if (!idea?.ai_proposal) throw new Error("Esta idea todavía no tiene propuesta de la IA");

  const proposal = idea.ai_proposal as AiIdeaProposal;

  let companyId = idea.company_id;
  if (!companyId && proposal.company_slug) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", proposal.company_slug)
      .maybeSingle();
    companyId = company?.id ?? null;
  }
  if (!companyId) {
    const { data: fallback } = await supabase.from("companies").select("id").limit(1).maybeSingle();
    companyId = fallback?.id ?? null;
  }
  if (!companyId) throw new Error("No hay ninguna empresa registrada para asignar esta idea");

  let projectId: string | null = null;

  if (proposal.kind === "project" && proposal.project) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        company_id: companyId,
        name: proposal.project.name || proposal.project.expected_outcome?.slice(0, 60) || "Proyecto sin título",
        expected_outcome: proposal.project.expected_outcome,
        description: proposal.project.description ?? null,
        priority: proposal.project.priority ?? 2,
        due_on: proposal.project.due_on ?? null,
      })
      .select("id")
      .single();
    if (projectError) throw new Error(projectError.message);
    projectId = project.id;

    if (proposal.kpis && proposal.kpis.length > 0) {
      await supabase.from("kpis").insert(
        proposal.kpis.map((k) => ({
          owner_id: user.id,
          project_id: projectId,
          name: k.name,
          unit: k.unit ?? "",
          target_value: k.target_value,
          frequency: k.frequency ?? "weekly",
        }))
      );
    }
  } else {
    // tasks_only: usar (o crear) un proyecto "Bandeja rápida" para esa empresa.
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", "Bandeja rápida")
      .maybeSingle();

    if (existing) {
      projectId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          company_id: companyId,
          name: "Bandeja rápida",
          expected_outcome: "Tareas sueltas de ejecución inmediata",
          priority: 2,
        })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      projectId = created.id;
    }
  }

  if (proposal.tasks.length > 0 && projectId) {
    const { error: tasksError } = await supabase.from("tasks").insert(
      proposal.tasks.map((t) => ({
        owner_id: user.id,
        project_id: projectId,
        title: t.title,
        description: t.description ?? null,
        is_urgent: t.is_urgent ?? false,
        is_important: t.is_important ?? true,
        estimated_minutes: t.estimated_minutes ?? null,
        energy: t.energy ?? "medium",
      }))
    );
    if (tasksError) throw new Error(tasksError.message);
  }

  await supabase
    .from("idea_inbox")
    .update({ status: "processed", created_project_id: projectId, processed_at: new Date().toISOString() })
    .eq("id", ideaId);

  revalidatePath("/ideas");
  revalidatePath("/proyectos");
  revalidatePath("/tareas");
  revalidatePath("/");
}

export async function discardIdea(ideaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("idea_inbox").update({ status: "discarded" }).eq("id", ideaId);
  if (error) throw new Error(error.message);
  revalidatePath("/ideas");
}
