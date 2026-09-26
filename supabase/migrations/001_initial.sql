-- Bhatti Electric Store catalog schema
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  category text not null,
  price numeric(12,2),
  description text,
  sku text unique,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_active_idx on public.products(active);
create index if not exists inventory_product_id_idx on public.inventory(product_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;

drop policy if exists "public can read active categories" on public.categories;
create policy "public can read active categories" on public.categories for select to anon, authenticated using (active = true);

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products" on public.products for select to anon, authenticated using (active = true);

drop policy if exists "public can read inventory availability" on public.inventory;
create policy "public can read inventory availability" on public.inventory for select to anon, authenticated using (true);

grant select on public.categories, public.products, public.inventory to anon, authenticated;

insert into public.categories (name, description, icon, sort_order) values
('Lighting','LED bulbs and energy-saving lighting','💡',1),
('Wires & Cables','House wiring and electrical cables','〰',2),
('Switches & Sockets','Switches, sockets and accessories','▣',3),
('Breakers','MCBs and electrical protection','⏚',4),
('Fans','Ceiling fans and exhaust fans','✣',5),
('PVC','PVC pipes and conduits','◯',6)
on conflict (name) do update set description=excluded.description, icon=excluded.icon, sort_order=excluded.sort_order;

insert into public.products (name, category, price, description, sku, active) values
('LED Bulb 12W','Lighting',280,'Energy-saving LED bulb for everyday home and shop lighting.','BES-LGT-001',true),
('Electrical Wire','Wires & Cables',1850,'Reliable electrical wire for household and project wiring.','BES-WIR-001',true),
('Universal Socket','Switches & Sockets',350,'Universal wall socket for common electrical connections.','BES-SOC-001',true),
('MCB Breaker','Breakers',650,'Circuit protection breaker for electrical distribution boards.','BES-BRK-001',true),
('Exhaust Fan','Fans',4200,'Ventilation fan suitable for kitchens, bathrooms and shops.','BES-FAN-001',true),
('PVC Conduit','PVC',180,'PVC conduit for protected electrical cable routing.','BES-PVC-001',true),
('Ceiling Fan','Fans',7800,'Everyday ceiling fan for home and commercial spaces.','BES-FAN-002',true),
('LED Bulb 20W','Lighting',420,'Brighter LED bulb for larger rooms and work areas.','BES-LGT-002',true),
('Flexible Cable','Wires & Cables',1450,'Flexible electrical cable for general installation work.','BES-WIR-002',true)
on conflict (sku) do update set name=excluded.name, category=excluded.category, price=excluded.price, description=excluded.description, active=excluded.active, updated_at=now();

insert into public.inventory (product_id, quantity, reorder_level)
select p.id, 0, 5 from public.products p where not exists (select 1 from public.inventory i where i.product_id=p.id);

update public.products p set category_id=c.id from public.categories c where p.category=c.name and p.category_id is distinct from c.id;
