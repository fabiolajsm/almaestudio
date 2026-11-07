create table if not exists public.appointment_reservations (
  id uuid primary key,
  appointment_date date not null,
  start_time time without time zone not null,
  duration_minutes integer not null check (duration_minutes >= 15),
  service_ids text[] not null check (cardinality(service_ids) > 0),
  total_price integer not null check (total_price > 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  calendar_event_id text not null unique,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint appointment_reservations_business_hours_check
    check (
      start_time >= time '08:00'
      and appointment_date + start_time
        + make_interval(mins => duration_minutes)
        <= appointment_date + time '22:00'
      and mod(
        extract(epoch from (start_time - time '08:00'))::integer,
        900
      ) = 0
    ),
  constraint appointment_reservations_active_times_excl
    exclude using gist (
      tsrange(
        appointment_date + start_time - interval '15 minutes',
        appointment_date + start_time
          + make_interval(mins => duration_minutes + 15),
        '[)'
      ) with &&
    )
    where (status in ('pending_review', 'confirmed'))
);

alter table public.appointment_reservations enable row level security;
revoke all on public.appointment_reservations from anon, authenticated;

create or replace function public."createAppoinment"(
  p_appointment_id uuid,
  p_appointment_date date,
  p_start_time time without time zone,
  p_service_ids text[],
  p_duration_minutes integer,
  p_total_price integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_calendar_event_id text
)
returns table (appointment_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_appointment_id is null
    or p_appointment_date is null
    or p_appointment_date < (now() at time zone 'America/Argentina/Buenos_Aires')::date
    or extract(dow from p_appointment_date) = 0
    or p_start_time is null
    or p_duration_minutes is null
    or p_duration_minutes < 15
    or coalesce(cardinality(p_service_ids), 0) = 0
    or p_total_price is null
    or p_total_price <= 0
    or length(trim(coalesce(p_customer_name, ''))) not between 2 and 100
    or length(trim(coalesce(p_customer_email, ''))) not between 3 and 254
    or trim(p_customer_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(trim(coalesce(p_customer_phone, ''))) not between 8 and 30
    or coalesce(p_calendar_event_id, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid appointment request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_appointment_date::text));

  return query
  insert into public.appointment_reservations as reservations (
    id,
    appointment_date,
    start_time,
    duration_minutes,
    service_ids,
    total_price,
    customer_name,
    customer_email,
    customer_phone,
    calendar_event_id
  )
  values (
    p_appointment_id,
    p_appointment_date,
    p_start_time,
    p_duration_minutes,
    p_service_ids,
    p_total_price,
    trim(p_customer_name),
    trim(p_customer_email),
    trim(p_customer_phone),
    p_calendar_event_id
  )
  returning reservations.id;
end;
$$;

revoke all on function public."createAppoinment"(
  uuid,
  date,
  time without time zone,
  text[],
  integer,
  integer,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public."createAppoinment"(
  uuid,
  date,
  time without time zone,
  text[],
  integer,
  integer,
  text,
  text,
  text,
  text
) to service_role;
