alter table public.trackers
  add column if not exists is_custom_time boolean not null default false;
