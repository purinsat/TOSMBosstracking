alter table public.trackers
  add column if not exists kind text not null default 'preset'
    check (kind in ('preset', 'manual_phase'));

alter table public.trackers
  add column if not exists phase_decimal numeric(2,1)
    check (
      phase_decimal is null
      or phase_decimal = 0.0
      or (phase_decimal >= 1.0 and phase_decimal <= 4.9)
    );

create index if not exists trackers_room_kind_idx
  on public.trackers (room_id, kind);
