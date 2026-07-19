-- Monitoreo de uso/costo de IA — necesario para calcular el costo marginal
-- real de un usuario y poder fijar precio de membresía con criterio (Fase 1
-- del plan hacia SaaS, ver vault/Desarrollo/).

create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  feature text not null check (feature in ('structure_idea', 'refine_proposal', 'weekly_review')),
  provider text not null check (provider in ('anthropic', 'openrouter')),
  model text not null,
  tier text check (tier in ('low', 'medium', 'high')),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_ai_usage_log_owner_date on public.ai_usage_log(owner_id, created_at);

alter table public.ai_usage_log enable row level security;
create policy "owner_full_access" on public.ai_usage_log for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
