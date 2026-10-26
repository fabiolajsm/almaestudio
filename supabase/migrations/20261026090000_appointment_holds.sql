create extension if not exists btree_gist with schema extensions;

create table if not exists public.appointment_reservations (
  id uuid primary key default gen_random_uuid(),
  appointment_date date not null,
  start_time time without time zone not null,
  duration_minutes integer not null check (duration_minutes between 15 and 300),
  service_ids text[] not null check (cardinality(service_ids) > 0),
  total_price integer not null check (total_price > 0),
  deposit_amount integer check (deposit_amount is null or deposit_amount = 5000),
  customer_name text,
  customer_email text,
  customer_phone text,
  proof_path text unique,
  status text not null default 'held'
    check (status in ('held', 'pending_review', 'confirmed', 'expired', 'cancelled')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint appointment_reservations_active_times_excl
    exclude using gist (
      tsrange(
        appointment_date + start_time,
        appointment_date + start_time + make_interval(mins => duration_minutes),
        '[)'
      ) with &&
    )
    where (status in ('held', 'pending_review', 'confirmed'))
);

alter table public.appointment_reservations enable row level security;
revoke all on public.appointment_reservations from anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'appointment-proofs',
  'appointment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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
  if p_appointment_date < (now() at time zone 'America/Argentina/Buenos_Aires')::date
    or extract(dow from p_appointment_date) = 0
    or p_start_time not in (
      time '10:00',
      time '14:00',
      time '15:30',
      time '18:30'
    )
    or coalesce(cardinality(p_service_ids), 0) = 0
    or p_duration_minutes not between 15 and 300
    or p_total_price <= 0 then
    raise exception 'Invalid appointment hold request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_appointment_date::text));

  update public.appointment_reservations as reservations
  set status = 'expired'
  where reservations.appointment_date = p_appointment_date
    and reservations.status in ('held', 'pending_review')
    and reservations.expires_at <= now();

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

create or replace function public.release_appointment_hold(p_hold_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointment_reservations
  set status = 'cancelled',
      expires_at = null
  where id = p_hold_id
    and status = 'held';

  return true;
end;
$$;

create or replace function public.submit_appointment_proof(
  p_hold_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_proof_path text,
  p_deposit_amount integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_deposit_amount <> 5000
    or length(trim(p_customer_name)) not between 2 and 100
    or length(trim(p_customer_email)) not between 3 and 254
    or length(trim(p_customer_phone)) not between 8 and 30
    or p_proof_path not like p_hold_id::text || '/%' then
    raise exception 'Invalid appointment proof submission' using errcode = '22023';
  end if;

  update public.appointment_reservations
  set status = 'pending_review',
      customer_name = trim(p_customer_name),
      customer_email = trim(p_customer_email),
      customer_phone = trim(p_customer_phone),
      proof_path = p_proof_path,
      deposit_amount = p_deposit_amount,
      expires_at = now() + interval '24 hours'
  where id = p_hold_id
    and status = 'held'
    and expires_at > now();

  if not found then
    raise exception 'Appointment hold expired or no longer exists' using errcode = 'P0001';
  end if;

  return true;
end;
$$;

revoke all on function public.create_appointment_hold(date, time without time zone, text[], integer, integer) from public, anon, authenticated;
revoke all on function public.release_appointment_hold(uuid) from public, anon, authenticated;
revoke all on function public.submit_appointment_proof(uuid, text, text, text, text, integer) from public, anon, authenticated;

grant execute on function public.create_appointment_hold(date, time without time zone, text[], integer, integer) to service_role;
grant execute on function public.release_appointment_hold(uuid) to service_role;
grant execute on function public.submit_appointment_proof(uuid, text, text, text, text, integer) to service_role;
