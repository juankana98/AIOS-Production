-- Centro de Comando — esquema inicial
-- Multi-tenant-ready: todo va colgado de owner_id = auth.uid() con RLS,
-- aunque en la Fase actual solo exista un usuario.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Función utilitaria para mantener updated_at
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- companies (Empresas)
-- ─────────────────────────────────────────────────────────────────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color text not null default '#6366f1',
  icon text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);
create trigger trg_companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- goals (Metas por empresa)
-- ─────────────────────────────────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  period_type text not null default 'quarter' check (period_type in ('month','quarter','year','custom')),
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('active','achieved','missed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_goals_company on public.goals(company_id);
create trigger trg_goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- okrs + key_results
-- ─────────────────────────────────────────────────────────────────────────
create table public.okrs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  objective text not null,
  description text,
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('active','achieved','missed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_okrs_company on public.okrs(company_id);
create index idx_okrs_goal on public.okrs(goal_id);
create trigger trg_okrs_updated_at before update on public.okrs
  for each row execute function public.set_updated_at();

create table public.key_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  okr_id uuid not null references public.okrs(id) on delete cascade,
  title text not null,
  metric_unit text not null default '',
  start_value numeric not null default 0,
  target_value numeric not null,
  current_value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_key_results_okr on public.key_results(okr_id);
create trigger trg_key_results_updated_at before update on public.key_results
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- projects (Proyectos)
-- ─────────────────────────────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  okr_id uuid references public.okrs(id) on delete set null,
  name text not null,
  expected_outcome text not null default '',
  description text,
  status text not null default 'active' check (status in ('backlog','active','on_hold','done','cancelled')),
  priority smallint not null default 2 check (priority between 1 and 4),
  progress_pct smallint not null default 0 check (progress_pct between 0 and 100),
  progress_mode text not null default 'auto' check (progress_mode in ('auto','manual')),
  starts_on date,
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_company on public.projects(company_id);
create index idx_projects_okr on public.projects(okr_id);
create trigger trg_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- kpis + kpi_entries (para tendencia histórica)
-- ─────────────────────────────────────────────────────────────────────────
create table public.kpis (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  unit text not null default '',
  target_value numeric not null,
  current_value numeric not null default 0,
  frequency text not null default 'weekly' check (frequency in ('daily','weekly','monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_kpis_project on public.kpis(project_id);
create trigger trg_kpis_updated_at before update on public.kpis
  for each row execute function public.set_updated_at();

create table public.kpi_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  value numeric not null,
  recorded_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index idx_kpi_entries_kpi on public.kpi_entries(kpi_id, recorded_on);

-- ─────────────────────────────────────────────────────────────────────────
-- tasks (Tareas)
-- ─────────────────────────────────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','blocked','done','cancelled')),
  is_urgent boolean not null default false,
  is_important boolean not null default true,
  estimated_minutes integer,
  actual_minutes integer not null default 0,
  due_at timestamptz,
  energy text not null default 'medium' check (energy in ('low','medium','high','deep')),
  order_index integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due on public.tasks(due_at);
create trigger trg_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- time_entries (Control de tiempos)
-- ─────────────────────────────────────────────────────────────────────────
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  note text,
  created_at timestamptz not null default now()
);
create index idx_time_entries_task on public.time_entries(task_id);
create index idx_time_entries_open on public.time_entries(owner_id) where ended_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- schedule_blocks (Agenda / time-blocking)
-- ─────────────────────────────────────────────────────────────────────────
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual','auto')),
  status text not null default 'planned' check (status in ('planned','done','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_schedule_time check (ends_at > starts_at)
);
create index idx_schedule_blocks_range on public.schedule_blocks(owner_id, starts_at);
create trigger trg_schedule_blocks_updated_at before update on public.schedule_blocks
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- checkins (Accountability diario/semanal)
-- ─────────────────────────────────────────────────────────────────────────
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  checkin_date date not null default current_date,
  type text not null default 'daily' check (type in ('daily','weekly')),
  wins text,
  blockers text,
  focus_next text,
  score smallint check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique (owner_id, checkin_date, type)
);
create index idx_checkins_date on public.checkins(owner_id, checkin_date);

-- ─────────────────────────────────────────────────────────────────────────
-- idea_inbox (bandeja de ideas sueltas → estructuradas por IA)
-- ─────────────────────────────────────────────────────────────────────────
create table public.idea_inbox (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  raw_text text not null,
  status text not null default 'pending' check (status in ('pending','processing','processed','discarded')),
  ai_proposal jsonb,
  company_id uuid references public.companies(id) on delete set null,
  created_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index idx_idea_inbox_status on public.idea_inbox(owner_id, status);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security — todo colgado de owner_id = auth.uid()
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'companies','goals','okrs','key_results','projects','kpis','kpi_entries',
    'tasks','time_entries','schedule_blocks','checkins','idea_inbox'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner_full_access" on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t
    );
  end loop;
end $$;
