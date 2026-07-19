-- Conexión OAuth a Google Calendar (lectura de disponibilidad real vía FreeBusy API)
-- para que el scheduler descuente reuniones reales al generar la agenda del día.

create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scope text not null default 'https://www.googleapis.com/auth/calendar.readonly',
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);
create trigger trg_google_calendar_connections_updated_at before update on public.google_calendar_connections
  for each row execute function public.set_updated_at();

alter table public.google_calendar_connections enable row level security;
create policy "owner_full_access" on public.google_calendar_connections for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Snapshot diario de capacidad real vs. tiempo ejecutado — usado para el panel de
-- desempeño en el Dashboard y el check-in de Accountability. Se recalcula on-demand,
-- esta tabla es solo un cache/histórico para no tener que llamar la API de Google
-- repetidamente y para poder graficar tendencia más adelante.
create table public.daily_capacity (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  capacity_date date not null default current_date,
  available_minutes integer not null default 0,
  executed_minutes integer not null default 0,
  source text not null default 'google_calendar' check (source in ('google_calendar', 'fallback_work_hours')),
  computed_at timestamptz not null default now(),
  unique (owner_id, capacity_date)
);
create index idx_daily_capacity_date on public.daily_capacity(owner_id, capacity_date);

alter table public.daily_capacity enable row level security;
create policy "owner_full_access" on public.daily_capacity for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
