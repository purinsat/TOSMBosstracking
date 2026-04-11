alter table public.room_settings
  add column if not exists preset1_name text not null default 'Preset 1',
  add column if not exists preset2_name text,
  add column if not exists preset2_p12 integer check (preset2_p12 is null or preset2_p12 >= 0),
  add column if not exists preset2_p23 integer check (preset2_p23 is null or preset2_p23 >= 0),
  add column if not exists preset2_p34 integer check (preset2_p34 is null or preset2_p34 >= 0),
  add column if not exists preset2_p4on integer check (preset2_p4on is null or preset2_p4on >= 0),
  add column if not exists preset3_name text,
  add column if not exists preset3_p12 integer check (preset3_p12 is null or preset3_p12 >= 0),
  add column if not exists preset3_p23 integer check (preset3_p23 is null or preset3_p23 >= 0),
  add column if not exists preset3_p34 integer check (preset3_p34 is null or preset3_p34 >= 0),
  add column if not exists preset3_p4on integer check (preset3_p4on is null or preset3_p4on >= 0);

update public.room_settings
set preset1_name = coalesce(nullif(trim(preset1_name), ''), 'Preset 1');

alter table public.trackers
  add column if not exists preset_slot integer check (preset_slot in (1, 2, 3));

update public.trackers
set preset_slot = 1
where preset_slot is null;
