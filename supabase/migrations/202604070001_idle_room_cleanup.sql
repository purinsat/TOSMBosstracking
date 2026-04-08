-- Auto-cleanup idle rooms.
-- Rule: delete room when it has no active trackers and no room activity for 24 hours.
-- Activity is based on the latest of:
--   - room created_at
--   - room_settings.updated_at
--   - trackers.created_at

do $$
begin
  create extension if not exists pg_cron;
exception
  when insufficient_privilege then
    raise notice 'Skipping pg_cron extension creation due to insufficient privilege.';
end $$;

create or replace function public.cleanup_idle_rooms(idle_for interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  with room_activity as (
    select
      r.id,
      greatest(
        r.created_at,
        coalesce(rs.updated_at, r.created_at),
        coalesce(max(t.created_at), r.created_at)
      ) as last_activity_at
    from public.rooms r
    left join public.room_settings rs on rs.room_id = r.id
    left join public.trackers t on t.room_id = r.id
    group by r.id, r.created_at, rs.updated_at
  ),
  candidates as (
    select ra.id
    from room_activity ra
    where
      ra.last_activity_at < now() - idle_for
      and not exists (
        select 1
        from public.trackers t_active
        where t_active.room_id = ra.id
          and t_active.target_at > now()
      )
  )
  delete from public.rooms r
  using candidates c
  where r.id = c.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

do $$
begin
  -- Replace old job if it exists.
  perform cron.unschedule('cleanup-idle-rooms-hourly');
exception
  when invalid_parameter_value then null;
  when undefined_function then null;
  when undefined_table then null;
  when internal_error then null;
end $$;

do $$
begin
  -- Hourly run; function itself enforces 24h inactivity threshold.
  perform cron.schedule(
    'cleanup-idle-rooms-hourly',
    '0 * * * *',
    $job$select public.cleanup_idle_rooms(interval '24 hours');$job$
  );
exception
  when undefined_function then
    raise notice 'pg_cron functions unavailable. Schedule this cleanup manually in Supabase.';
  when undefined_table then
    raise notice 'cron schema unavailable. Schedule this cleanup manually in Supabase.';
end $$;
