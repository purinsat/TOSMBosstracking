alter table public.trackers
  drop constraint if exists trackers_phase_decimal_check;

alter table public.trackers
  add constraint trackers_phase_decimal_check check (
    phase_decimal is null
    or phase_decimal = 0.0
    or (phase_decimal >= 1.0 and phase_decimal <= 5.0)
  );
