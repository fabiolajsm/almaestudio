create table if not exists public.appointment_business_hours (
  id text primary key default 'default' check (id = 'default'),
  opening_time time not null,
  closing_time time not null,
  working_days smallint[] not null
    check (cardinality(working_days) between 1 and 7),
  updated_at timestamptz not null default now(),
  check (opening_time < closing_time)
);

create table if not exists public.appointment_service_categories (
  id text primary key,
  name text not null check (char_length(trim(name)) between 1 and 60),
  note text,
  sort_order integer not null unique
);

create table if not exists public.appointment_services (
  id text primary key,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 240),
  category text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 600),
  price integer not null check (price between 0 and 10000000),
  sort_order integer not null
);

insert into public.appointment_service_categories (id, name, note, sort_order)
values
  ('manicura', 'Manicura', null, 1),
  ('pedicura', 'Pedicura', null, 2),
  ('cejas-pestanas', 'Cejas y pestañas', null, 3),
  ('promociones', 'Promociones', 'Las promociones no son acumulables con otros descuentos.', 4)
on conflict (id) do nothing;

alter table public.appointment_services
  drop constraint if exists appointment_services_category_check;
alter table public.appointment_services
  drop constraint if exists appointment_services_sort_order_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointment_services_category_fkey'
      and conrelid = 'public.appointment_services'::regclass
  ) then
    alter table public.appointment_services
      add constraint appointment_services_category_fkey
      foreign key (category)
      references public.appointment_service_categories (id);
  end if;
end
$$;

alter table public.appointment_business_hours enable row level security;
alter table public.appointment_service_categories enable row level security;
alter table public.appointment_services enable row level security;
revoke all on public.appointment_business_hours from anon, authenticated;
revoke all on public.appointment_service_categories from anon, authenticated;
revoke all on public.appointment_services from anon, authenticated;
grant all on public.appointment_business_hours to service_role;
grant all on public.appointment_service_categories to service_role;
grant all on public.appointment_services to service_role;

do $$
begin
  if to_regclass('public.appointment_settings') is not null then
    execute $migration$
      insert into public.appointment_business_hours
        (id, opening_time, closing_time, working_days)
      select
        'default',
        (time '00:00' + ((settings->>'openingTime')::integer * interval '1 minute'))::time,
        (time '00:00' + ((settings->>'closingTime')::integer * interval '1 minute'))::time,
        array(
          select jsonb_array_elements_text(settings->'workingDays')::smallint
        )
      from public.appointment_settings
      where id is true
        and settings ? 'openingTime'
        and settings ? 'closingTime'
        and settings ? 'workingDays'
      on conflict (id) do nothing
    $migration$;

    execute $migration$
      insert into public.appointment_services
        (id, name, description, category, duration_minutes, price, sort_order)
      select
        service->>'id',
        service->>'name',
        service->>'description',
        service->>'category',
        (service->>'duration')::integer,
        (service->>'price')::integer,
        position::integer
      from public.appointment_settings as stored
      cross join lateral jsonb_array_elements(stored.settings->'services')
        with ordinality as items(service, position)
      where stored.id is true
        and jsonb_typeof(stored.settings->'services') = 'array'
      on conflict (id) do nothing
    $migration$;
  end if;
end
$$;

insert into public.appointment_business_hours
  (id, opening_time, closing_time, working_days)
values
  ('default', '08:00', '22:00', array[1, 2, 3, 4, 5, 6]::smallint[])
on conflict (id) do nothing;

insert into public.appointment_services
  (id, name, description, category, duration_minutes, price, sort_order)
values
  ('mani-belleza', 'Belleza', 'Manicuría para cuidar y prolijar tus uñas naturales.', 'manicura', 60, 12000, 1),
  ('mani-semipermanente', 'Semipermanente', 'Color duradero y brillante para tus uñas.', 'manicura', 60, 25000, 2),
  ('mani-capping', 'Capping', 'Refuerzo para proteger y dar estructura a tus uñas naturales.', 'manicura', 60, 28000, 3),
  ('mani-esculpidas-gel', 'Esculpidas en Gel', 'Extensión de uñas con gel para lograr el largo que buscás.', 'manicura', 60, 38000, 4),
  ('mani-soft-gel', 'Soft Gel', 'Extensión de uñas con tips de gel y acabado prolijo.', 'manicura', 60, 32000, 5),
  ('mani-diseno-extra', 'Diseños elaborados o extras', 'Sumá detalles o diseños especiales a tu servicio. Consultar antes.', 'manicura', 60, 3000, 6),
  ('pedi-belleza', 'Belleza de pies', 'Cuidado y prolijidad para tus pies y uñas.', 'pedicura', 60, 18000, 7),
  ('pedi-semipermanente', 'Semipermanente', 'Color duradero y brillante para las uñas de tus pies.', 'pedicura', 60, 25000, 8),
  ('pedi-combinada', 'Pedicura + Semipermanente', 'Cuidado de pies y uñas con color semipermanente.', 'pedicura', 60, 33000, 9),
  ('cejas-perfilado', 'Perfilado', 'Diseño y limpieza para definir la forma de tus cejas.', 'cejas-pestanas', 60, 17000, 10),
  ('cejas-laminado', 'Perfilado + Laminado', 'Cejas definidas y peinadas para un efecto más ordenado.', 'cejas-pestanas', 60, 38000, 11),
  ('cejas-laminado-tinte', 'Perfilado + Laminado + Tinte', 'Diseño, laminado y tinte para realzar tus cejas.', 'cejas-pestanas', 60, 43000, 12),
  ('pestanas-lifting', 'Lifting', 'Realza la curvatura natural de tus pestañas.', 'cejas-pestanas', 60, 34000, 13),
  ('pestanas-lifting-tinte', 'Lifting + Tinte', 'Curvatura y color para destacar tus pestañas naturales.', 'cejas-pestanas', 60, 38000, 14),
  ('promo-manos-semipermanente', 'Semipermanente manos', 'Un color duradero para lucir tus uñas de las manos.', 'promociones', 60, 22000, 15),
  ('promo-manos-pies', 'Semipermanente manos + pies', 'Color semipermanente para uñas de manos y pies.', 'promociones', 60, 40000, 16),
  ('promo-capping-pies', 'Capping manos + semi pies', 'Refuerzo para manos y semipermanente en las uñas de los pies.', 'promociones', 60, 50000, 17),
  ('promo-laminado-lifting', 'Laminado de cejas + Lifting de pestañas', 'Cejas peinadas y pestañas realzadas en una misma visita.', 'promociones', 60, 55000, 18)
on conflict (id) do nothing;

drop function if exists public.save_appointment_settings(jsonb, time, time, smallint[]);

create or replace function public.save_appointment_settings(
  p_categories jsonb,
  p_services jsonb,
  p_opening_time time,
  p_closing_time time,
  p_working_days smallint[]
)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  insert into appointment_service_categories (id, name, note, sort_order)
  select
    category->>'id',
    category->>'name',
    category->>'note',
    position::integer
  from jsonb_array_elements(p_categories) with ordinality
    as items(category, position)
  on conflict (id) do update set
    name = excluded.name,
    note = excluded.note,
    sort_order = excluded.sort_order;

  insert into appointment_business_hours
    (id, opening_time, closing_time, working_days, updated_at)
  values
    ('default', p_opening_time, p_closing_time, p_working_days, now())
  on conflict (id) do update set
    opening_time = excluded.opening_time,
    closing_time = excluded.closing_time,
    working_days = excluded.working_days,
    updated_at = now();

  delete from appointment_services as existing
  where not exists (
    select 1
    from jsonb_array_elements(p_services) as items(service)
    where items.service->>'id' = existing.id
  );

  insert into appointment_services
    (id, name, description, category, duration_minutes, price, sort_order)
  select
    service->>'id',
    service->>'name',
    service->>'description',
    service->>'category',
    (service->>'duration')::integer,
    (service->>'price')::integer,
    position::integer
  from jsonb_array_elements(p_services) with ordinality as items(service, position)
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    duration_minutes = excluded.duration_minutes,
    price = excluded.price,
    sort_order = excluded.sort_order;

  return true;
end;
$$;

revoke all on function public.save_appointment_settings(jsonb, jsonb, time, time, smallint[]) from public, anon, authenticated;
grant execute on function public.save_appointment_settings(jsonb, jsonb, time, time, smallint[]) to service_role;
