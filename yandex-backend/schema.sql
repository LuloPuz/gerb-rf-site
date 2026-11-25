create extension if not exists pgcrypto;

create table if not exists admin_users (
  id bigserial primary key,
  email text not null,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists admin_users_email_unique_idx
  on admin_users (lower(email));

create table if not exists orders (
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

create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_phone_idx on orders(customer_phone);
create index if not exists orders_email_idx on orders(customer_email);

-- Create the first administrator manually in Yandex WebSQL.
-- Do NOT send the password in chat and do NOT commit it to GitHub.
-- Replace both placeholders locally before running:
-- insert into admin_users(email, password_hash)
-- values ('YOUR_EMAIL', crypt('YOUR_PASSWORD', gen_salt('bf', 12)));
