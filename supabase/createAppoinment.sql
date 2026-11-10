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
  talo_payment_id text,
  payment_url text,
  payment_status text
    constraint appointment_reservations_payment_status_check
    check (payment_status in ('PENDING', 'SUCCESS', 'OVERPAID', 'UNDERPAID', 'EXPIRED')),
  payment_amount integer
    constraint appointment_reservations_payment_amount_check
    check (payment_amount is null or payment_amount > 0),
  payment_expires_at timestamptz,
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

alter table public.appointment_reservations
add column if not exists talo_payment_id text,
add column if not exists payment_url text,
add column if not exists payment_status text,
add column if not exists payment_amount integer,
add column if not exists payment_expires_at timestamptz;

do $$
begin
if not exists (
  select 1
  from pg_constraint
  where conname = 'appointment_reservations_payment_status_check'
    and conrelid = 'public.appointment_reservations'::regclass
) then
  alter table public.appointment_reservations
    add constraint appointment_reservations_payment_status_check
    check (payment_status in ('PENDING', 'SUCCESS', 'OVERPAID', 'UNDERPAID', 'EXPIRED'));
end if;

if not exists (
  select 1
  from pg_constraint
  where conname = 'appointment_reservations_payment_amount_check'
    and conrelid = 'public.appointment_reservations'::regclass
) then
  alter table public.appointment_reservations
    add constraint appointment_reservations_payment_amount_check
    check (payment_amount is null or payment_amount > 0);
end if;
end;
$$;

create unique index if not exists appointment_reservations_talo_payment_id_key
on public.appointment_reservations (talo_payment_id)
where talo_payment_id is not null;

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
    calendar_event_id,
    payment_expires_at
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
    p_calendar_event_id,
    now() + interval '5 days'
  )
  returning reservations.id;
end;
$$;

create or replace function public.expirePendingAppoinmentPayments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  update public.appointment_reservations
  set status = 'cancelled'
  where status = 'pending_review'
    and payment_expires_at <= now()
    and payment_status is distinct from 'SUCCESS';

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

create or replace function public.saveAppoinmentPayment(
  p_appointment_id uuid,
  p_payment_id text,
  p_payment_url text,
  p_payment_status text,
  p_payment_amount integer,
  p_payment_expires_at timestamptz
)
returns table (appointment_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_appointment_id is null
    or coalesce(trim(p_payment_id), '') = ''
    or p_payment_status not in ('PENDING', 'SUCCESS', 'OVERPAID', 'UNDERPAID', 'EXPIRED')
    or (p_payment_amount is not null and p_payment_amount <= 0) then
    raise exception 'Invalid appointment payment' using errcode = '22023';
  end if;

  return query
  update public.appointment_reservations as reservations
  set talo_payment_id = coalesce(reservations.talo_payment_id, p_payment_id),
      payment_url = coalesce(p_payment_url, reservations.payment_url),
  payment_status = case
    when reservations.payment_status = 'SUCCESS' then 'SUCCESS'
    when p_payment_status = 'SUCCESS' then 'SUCCESS'
    when reservations.payment_status = 'EXPIRED' then 'EXPIRED'
    else p_payment_status
  end,
      payment_amount = coalesce(p_payment_amount, reservations.payment_amount),
      payment_expires_at = coalesce(
        p_payment_expires_at,
        reservations.payment_expires_at
      ),
      status = case
        when p_payment_status = 'EXPIRED'
          and reservations.status = 'pending_review'
        then 'cancelled'
        else reservations.status
      end
  where reservations.id = p_appointment_id
    and (
      reservations.talo_payment_id is null
      or reservations.talo_payment_id = p_payment_id
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

revoke all on function public.expirePendingAppoinmentPayments()
  from public, anon, authenticated;
grant execute on function public.expirePendingAppoinmentPayments()
  to service_role;

revoke all on function public.saveAppoinmentPayment(
  uuid,
  text,
  text,
  text,
  integer,
  timestamptz
) from public, anon, authenticated;
grant execute on function public.saveAppoinmentPayment(
  uuid,
  text,
  text,
  text,
  integer,
  timestamptz
) to service_role;
