create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  total bigint not null check (total >= 0),
  status text not null,
  payment_status text not null,
  order_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

create index if not exists orders_customer_phone_idx
  on public.orders (customer_phone);

alter table public.orders enable row level security;

-- The application accesses this table only from the Express server using
-- SUPABASE_SERVICE_ROLE_KEY. No public/anon policies are intentionally added.
revoke all on public.orders from anon, authenticated;
grant all on public.orders to service_role;
