drop function if exists public.submit_appointment_proof(
  uuid,
  text,
  text,
  text,
  text,
  integer
);

create or replace function public.submit_appointment_booking(
  p_hold_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hold_id is null
    or length(trim(coalesce(p_customer_name, ''))) not between 2 and 100
    or length(trim(coalesce(p_customer_email, ''))) not between 3 and 254
    or trim(p_customer_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(trim(coalesce(p_customer_phone, ''))) not between 8 and 30 then
    raise exception 'Invalid appointment booking request' using errcode = '22023';
  end if;

  update public.appointment_reservations
  set status = 'pending_review',
      customer_name = trim(p_customer_name),
      customer_email = trim(p_customer_email),
      customer_phone = trim(p_customer_phone),
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

revoke all on function public.submit_appointment_booking(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_appointment_booking(uuid, text, text, text) to service_role;

delete from storage.buckets as buckets
where buckets.id = 'appointment-proofs'
  and not exists (
    select 1
    from storage.objects
    where storage.objects.bucket_id = buckets.id
  );
