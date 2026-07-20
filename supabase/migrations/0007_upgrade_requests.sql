-- Fase 4 del roadmap SaaS: landing page pública. Captura de interés en
-- planes de pago (Pro/Team) — todavía no hay proveedor de billing
-- conectado (Stripe u otro, sin decidir), así que el CTA de "Actualizar"
-- guarda la solicitud acá en vez de cobrar, y Juan Camilo la revisa a mano
-- en el SQL Editor / Table Editor de Supabase mientras no exista un panel
-- de admin dedicado.
begin;

create table public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  email text not null,
  plan_interested text not null default 'pro',
  message text,
  created_at timestamptz not null default now()
);

-- Formulario público (landing page, visitantes sin sesión) y desde /equipo
-- (usuarios autenticados) — ambos casos deben poder insertar. No hay
-- policy de select: solo el service role (Juan Camilo vía SQL Editor) lee
-- estas filas por ahora.
alter table public.upgrade_requests enable row level security;
create policy "anyone_can_request_upgrade" on public.upgrade_requests for insert
  to anon, authenticated
  with check (true);

commit;
