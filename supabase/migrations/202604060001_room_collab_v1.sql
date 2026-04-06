create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  created_at timestamptz not null default now(),
  constraint rooms_code_format check (code ~ '^[A-Z0-9]{6}$')
);

create table if not exists public.room_settings (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  p12 integer not null default 15 check (p12 >= 0),
  p23 integer not null default 11 check (p23 >= 0),
  p34 integer not null default 7 check (p34 >= 0),
  p4on integer not null default 3 check (p4on >= 0),
  sound_volume integer not null default 70 check (sound_volume >= 0 and sound_volume <= 100),
  sound_muted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.trackers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  map_lv integer not null check (map_lv > 0),
  ch integer not null check (ch >= 1 and ch <= 30),
  phase text not null check (phase in ('No event', '1', '2', '3', '4')),
  no_event_minutes integer not null default 0 check (no_event_minutes >= 0),
  target_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists trackers_room_target_idx on public.trackers (room_id, target_at);

alter table public.rooms enable row level security;
alter table public.room_settings enable row level security;
alter table public.trackers enable row level security;

-- V1 policy: open access for anon/authenticated clients once they know room code.
drop policy if exists rooms_read_write_all on public.rooms;
create policy rooms_read_write_all
  on public.rooms
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists room_settings_read_write_all on public.room_settings;
create policy room_settings_read_write_all
  on public.room_settings
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists trackers_read_write_all on public.trackers;
create policy trackers_read_write_all
  on public.trackers
  for all
  to anon, authenticated
  using (true)
  with check (true);

create or replace function public.touch_room_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_room_settings_updated_at on public.room_settings;
create trigger trg_room_settings_updated_at
before update on public.room_settings
for each row
execute function public.touch_room_settings_updated_at();
