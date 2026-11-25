-- ДЕРЖАВА: central orders + protected admin access.
-- Current production schema for Supabase project Derzhava.

create extension if not exists pgcrypto;
create schema if not exists private;

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
    check (status in ('Заказ принят','Подтверждён','Ожидает оплаты','В производстве','Отправлен','Получен','Отменён')),
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

create or replace function private.set_updated_at()
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
for each row execute function private.set_updated_at();

create or replace function private.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
     and exists (
       select 1 from public.admin_users where user_id = p_user_id
     );
$$;

revoke all on function private.is_admin(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin((select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.orders enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.orders from anon, authenticated;

grant select on table public.admin_users to authenticated;
grant select, update on table public.orders to authenticated;

drop policy if exists "admins can view own membership" on public.admin_users;
create policy "admins can view own membership"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "admins can read orders" on public.orders;
create policy "admins can read orders"
on public.orders for select
to authenticated
using (private.is_admin((select auth.uid())));

drop policy if exists "admins can update orders" on public.orders;
create policy "admins can update orders"
on public.orders for update
to authenticated
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

-- Public order creation is handled by the Supabase Edge Function "create-order".
-- The browser has no INSERT/SELECT access to public.orders.
