-- ДЕРЖАВА: database schema for central order storage + protected admin access.
-- Run in Supabase SQL Editor once per project.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'Заказ принят'
    check (status in ('Заказ принят','Подтверждён','В производстве','Готов','Отправлен','Получен','Отменён')),
  total numeric(12,2) not null default 0 check (total >= 0),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null default '',
  organization text not null default '',
  inn text not null default '',
  address text not null default '',
  delivery text not null default '',
  comment text not null default '',
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  source text not null default 'website'
);

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_phone_idx on public.orders(customer_phone);
create index if not exists orders_email_idx on public.orders(customer_email);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.orders enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
grant select, update on table public.orders to authenticated;

drop policy if exists "admins can read orders" on public.orders;
create policy "admins can read orders"
on public.orders for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "admins can update orders" on public.orders;
create policy "admins can update orders"
on public.orders for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create or replace function public.create_public_order(
  p_customer jsonb,
  p_items jsonb,
  p_delivery text default '',
  p_comment text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_number text;
  v_total numeric(12,2);
  v_name text := btrim(coalesce(p_customer->>'name',''));
  v_phone text := btrim(coalesce(p_customer->>'phone',''));
  v_attempt integer := 0;
begin
  if v_name = '' then
    raise exception 'Имя обязательно';
  end if;
  if v_phone = '' then
    raise exception 'Телефон обязателен';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Корзина пуста';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Слишком много позиций';
  end if;

  select coalesce(sum(
    case when (item->>'price') ~ '^[0-9]+([.][0-9]+)?$' then (item->>'price')::numeric else 0 end
    * greatest(case when (item->>'qty') ~ '^[0-9]+$' then (item->>'qty')::int else 1 end, 1)
  ),0)
  into v_total
  from jsonb_array_elements(p_items) item;

  if v_total <= 0 then
    raise exception 'Некорректная сумма заказа';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_number := 'ДРЖ-' || lpad((floor(random()*10000000))::int::text, 7, '0');
    exit when not exists (select 1 from public.orders where order_number = v_number);
    if v_attempt > 20 then
      raise exception 'Не удалось создать номер заказа';
    end if;
  end loop;

  insert into public.orders (
    order_number,status,total,customer_name,customer_phone,customer_email,
    organization,inn,address,delivery,comment,items,source
  ) values (
    v_number,'Заказ принят',v_total,v_name,v_phone,
    btrim(coalesce(p_customer->>'email','')),
    btrim(coalesce(p_customer->>'organization','')),
    btrim(coalesce(p_customer->>'inn','')),
    btrim(coalesce(p_customer->>'address','')),
    left(coalesce(p_delivery,''),500),
    left(coalesce(p_comment,''),3000),
    p_items,'website'
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'number', v_number,
    'status', 'Заказ принят',
    'total', v_total
  );
end;
$$;

revoke all on function public.create_public_order(jsonb,jsonb,text,text) from public;
grant execute on function public.create_public_order(jsonb,jsonb,text,text) to anon, authenticated;

-- After creating an administrator in Authentication -> Users, grant admin access:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL';
