create table if not exists public.products(id uuid primary key default gen_random_uuid(),name text not null,category text not null,price numeric(12,2),description text,active boolean not null default true,created_at timestamptz not null default now());
create index if not exists products_category_idx on public.products(category);
alter table public.products enable row level security;
create policy "public can read active products" on public.products for select using (active=true);