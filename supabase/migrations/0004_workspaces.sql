-- Arquitectura de equipos/workspace (Fase 2 del rumbo SaaS, ver vault/Desarrollo/).
-- Billing por workspace, no por usuario individual. Todo lo que hoy cuelga de
-- owner_id pasa a colgar ADEMÁS de workspace_id (owner_id se conserva como
-- "quién creó/es responsable de la fila" — sigue siendo útil dentro de un
-- equipo; workspace_id es el nuevo límite de acceso/RLS).
--
-- Corre como una sola transacción: o se aplica todo, o no se aplica nada.
begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Tablas núcleo de workspace
-- ─────────────────────────────────────────────────────────────────────────
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'personal' check (plan in ('personal', 'free', 'pro', 'team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_workspace_members_workspace on public.workspace_members(workspace_id);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users(id),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  unique (workspace_id, email)
);
create index idx_workspace_invitations_email on public.workspace_invitations(email) where accepted_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Funciones helper (SECURITY DEFINER = evalúan sin pasar de nuevo por RLS
-- de workspace_members, para no crear recursión en las policies de abajo)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid()
$$;

create or replace function public.current_user_role_in(ws_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.workspace_members where workspace_id = ws_id and user_id = auth.uid()
$$;

-- Workspace por defecto del usuario actual — usado como DEFAULT de la
-- columna workspace_id en cada tabla de negocio, para que el código
-- existente que inserta filas sin especificar workspace_id (todavía) siga
-- funcionando sin cambios mientras cada usuario tenga un solo workspace.
create or replace function public.default_workspace_id()
returns uuid
language sql
stable
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid() order by created_at asc limit 1;
$$;

-- Crea un workspace nuevo con el usuario actual como owner — atómico, evita
-- el problema de "para insertar el primer miembro hace falta ya ser miembro".
create or replace function public.create_workspace_with_owner(ws_name text, ws_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces (name, slug) values (ws_name, ws_slug) returning id into new_workspace_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (new_workspace_id, auth.uid(), 'owner');
  return new_workspace_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-provisión: todo usuario nuevo recibe un workspace personal, salvo
-- que tenga una invitación pendiente esperándolo (entonces se une a ese
-- workspace en vez de crear uno nuevo).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  inv record;
begin
  select * into inv from public.workspace_invitations
    where email = new.email and accepted_at is null and expires_at > now()
    order by created_at desc limit 1;

  if inv.id is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
      values (inv.workspace_id, new.id, inv.role)
      on conflict (workspace_id, user_id) do nothing;
    update public.workspace_invitations set accepted_at = now() where id = inv.id;
  else
    insert into public.workspaces (name, slug)
      values (
        coalesce(nullif(split_part(new.email, '@', 1), ''), 'Mi Workspace'),
        'ws-' || substr(new.id::text, 1, 8)
      )
      returning id into new_workspace_id;
    insert into public.workspace_members (workspace_id, user_id, role)
      values (new_workspace_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS de las tablas de workspace mismas
-- ─────────────────────────────────────────────────────────────────────────
alter table public.workspaces enable row level security;
create policy "member_can_view_workspace" on public.workspaces for select
  using (id in (select current_user_workspace_ids()));
create policy "owner_can_update_workspace" on public.workspaces for update
  using (current_user_role_in(id) = 'owner');

alter table public.workspace_members enable row level security;
create policy "member_can_view_members" on public.workspace_members for select
  using (workspace_id in (select current_user_workspace_ids()));
create policy "owner_admin_can_insert_members" on public.workspace_members for insert
  with check (current_user_role_in(workspace_id) in ('owner', 'admin'));
create policy "owner_admin_can_update_members" on public.workspace_members for update
  using (current_user_role_in(workspace_id) in ('owner', 'admin'));
create policy "owner_or_self_can_delete_members" on public.workspace_members for delete
  using (current_user_role_in(workspace_id) = 'owner' or user_id = auth.uid());

alter table public.workspace_invitations enable row level security;
create policy "owner_admin_can_view_invitations" on public.workspace_invitations for select
  using (current_user_role_in(workspace_id) in ('owner', 'admin'));
create policy "owner_admin_can_create_invitations" on public.workspace_invitations for insert
  with check (current_user_role_in(workspace_id) in ('owner', 'admin') and invited_by = auth.uid());
create policy "owner_admin_can_delete_invitations" on public.workspace_invitations for delete
  using (current_user_role_in(workspace_id) in ('owner', 'admin'));

-- ─────────────────────────────────────────────────────────────────────────
-- Agrega workspace_id a cada tabla de negocio existente, hace backfill desde
-- el owner_id de cada fila, y reemplaza la policy "owner_full_access" (dueño
-- único) por una basada en membresía de workspace. Todo en un loop dinámico
-- para no repetir 15 veces el mismo bloque y arriesgar un typo en alguna.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'companies', 'goals', 'okrs', 'key_results', 'projects', 'kpis', 'kpi_entries',
    'tasks', 'time_entries', 'schedule_blocks', 'checkins', 'idea_inbox',
    'google_calendar_connections', 'daily_capacity', 'ai_usage_log'
  ];
  r record;
  new_ws_id uuid;
begin
  -- 1) Asegura que todo owner_id que ya tenga filas (o exista en auth.users)
  --    tenga un workspace propio, para usuarios que se crearon ANTES de que
  --    existiera el trigger on_auth_user_created.
  for r in (
    select distinct owner_id from public.companies
    union select distinct owner_id from public.goals
    union select distinct owner_id from public.okrs
    union select distinct owner_id from public.key_results
    union select distinct owner_id from public.projects
    union select distinct owner_id from public.kpis
    union select distinct owner_id from public.kpi_entries
    union select distinct owner_id from public.tasks
    union select distinct owner_id from public.time_entries
    union select distinct owner_id from public.schedule_blocks
    union select distinct owner_id from public.checkins
    union select distinct owner_id from public.idea_inbox
    union select distinct owner_id from public.google_calendar_connections
    union select distinct owner_id from public.daily_capacity
    union select distinct owner_id from public.ai_usage_log
    union select id from auth.users
  ) loop
    if not exists (select 1 from public.workspace_members where user_id = r.owner_id) then
      insert into public.workspaces (name, slug)
        values ('Mi Workspace', 'ws-' || substr(r.owner_id::text, 1, 8))
        returning id into new_ws_id;
      insert into public.workspace_members (workspace_id, user_id, role)
        values (new_ws_id, r.owner_id, 'owner');
    end if;
  end loop;

  -- 2) Por cada tabla de negocio: agrega la columna (con default = workspace
  --    actual del usuario, para no romper inserts existentes), backfillea
  --    desde owner_id, la vuelve NOT NULL, y cambia la policy de RLS.
  foreach t in array tables loop
    execute format(
      'alter table public.%I add column workspace_id uuid references public.workspaces(id) default public.default_workspace_id()',
      t
    );
    execute format(
      'update public.%I x set workspace_id = wm.workspace_id
         from public.workspace_members wm
         where wm.user_id = x.owner_id and x.workspace_id is null',
      t
    );
    execute format('alter table public.%I alter column workspace_id set not null', t);
    execute format('create index idx_%s_workspace on public.%I(workspace_id)', t, t);

    execute format('drop policy if exists "owner_full_access" on public.%I', t);
    execute format(
      'create policy "workspace_member_access" on public.%I for all
         using (workspace_id in (select current_user_workspace_ids()))
         with check (workspace_id in (select current_user_workspace_ids()))',
      t
    );
  end loop;
end $$;

commit;
