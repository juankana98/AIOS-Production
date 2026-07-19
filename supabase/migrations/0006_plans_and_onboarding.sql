-- Fase 3 del roadmap SaaS: freemium + onboarding.
--
-- 1) Los workspaces creados orgánicamente a partir de ahora (signup público,
--    sin invitación) nacen en plan 'free' (con topes), no 'personal'. El
--    plan 'personal' queda reservado para el/los workspace(s) que ya
--    existían antes de este cambio (uso interno de Juan Camilo) — no se
--    tocan, siguen sin topes.
-- 2) Tabla user_profiles para el onboarding (rol, tipo de negocio, reto,
--    objetivo) — es por usuario, no por workspace, porque cada persona
--    invitada a un workspace compartido completa su propio onboarding.
-- 3) Backfill: todo usuario que ya existiera antes de este onboarding queda
--    marcado como "ya completado" para no interrumpirlo con el wizard.
begin;

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
    insert into public.workspaces (name, slug, plan)
      values (
        coalesce(nullif(split_part(new.email, '@', 1), ''), 'Mi Workspace'),
        'ws-' || substr(new.id::text, 1, 8),
        'free'
      )
      returning id into new_workspace_id;
    insert into public.workspace_members (workspace_id, user_id, role)
      values (new_workspace_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text,
  business_type text,
  main_challenge text,
  main_goal text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_user_profiles_updated_at before update on public.user_profiles
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
create policy "self_access" on public.user_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into public.user_profiles (user_id, onboarding_completed_at)
  select id, now() from auth.users
  on conflict (user_id) do nothing;

commit;
