create or replace function public.create_appointment_hold(
  p_appointment_date date,
  p_start_time time without time zone,
  p_service_ids text[],
  p_duration_minutes integer,
  p_total_price integer
)
returns table (hold_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_appointment_date is null
    or p_appointment_date < (now() at time zone 'America/Argentina/Buenos_Aires')::date
    or extract(dow from p_appointment_date) = 0
    or p_start_time is null
    or p_start_time < time '09:00'
    or p_duration_minutes is null
    or p_start_time + make_interval(mins => p_duration_minutes) > time '22:00'
    or mod(extract(epoch from (p_start_time - time '09:00'))::integer, 1800) <> 0
    or coalesce(cardinality(p_service_ids), 0) = 0
    or p_duration_minutes not between 15 and 300
    or p_total_price is null
    or p_total_price <= 0 then
    raise exception 'Invalid appointment hold request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_appointment_date::text));

  update public.appointment_reservations as reservations
  set status = 'expired'
  where reservations.appointment_date = p_appointment_date
    and reservations.status in ('held', 'pending_review')
    and reservations.expires_at <= now();

  if exists (
    select 1
    from public.appointment_reservations as reservations
    where reservations.appointment_date = p_appointment_date
      and reservations.status in ('held', 'pending_review', 'confirmed')
      and (
        reservations.status = 'confirmed'
        or reservations.expires_at > now()
      )
      and tsrange(
        p_appointment_date + p_start_time - interval '15 minutes',
        p_appointment_date + p_start_time
          + make_interval(mins => p_duration_minutes + 15),
        '[)'
      ) && tsrange(
        reservations.appointment_date + reservations.start_time,
        reservations.appointment_date + reservations.start_time
          + make_interval(mins => reservations.duration_minutes),
        '[)'
      )
  ) then
    raise exception 'Appointment slot is no longer available' using errcode = '23P01';
  end if;

  return query
  insert into public.appointment_reservations as reservations (
    appointment_date,
    start_time,
    duration_minutes,
    service_ids,
    total_price,
    status,
    expires_at
  )
  values (
    p_appointment_date,
    p_start_time,
    p_duration_minutes,
    p_service_ids,
    p_total_price,
    'held',
    now() + interval '15 minutes'
  )
  returning reservations.id, reservations.expires_at;
end;
$$;

create or replace function public.get_active_appointment_busy_intervals(
  p_start_date date,
  p_end_date date
)
returns table (
  appointment_date date,
  start_time time without time zone,
  duration_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    reservations.appointment_date,
    reservations.start_time,
    reservations.duration_minutes
  from public.appointment_reservations as reservations
  where reservations.appointment_date between p_start_date and p_end_date
    and reservations.status in ('held', 'pending_review', 'confirmed')
    and (
      reservations.status = 'confirmed'
      or reservations.expires_at > now()
    );
$$;

revoke all on function public.create_appointment_hold(date, time without time zone, text[], integer, integer) from public, anon, authenticated;
revoke all on function public.get_active_appointment_busy_intervals(date, date) from public, anon, authenticated;

grant execute on function public.create_appointment_hold(date, time without time zone, text[], integer, integer) to service_role;
grant execute on function public.get_active_appointment_busy_intervals(date, date) to service_role;
