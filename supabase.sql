-- Run this once in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 5000),
  recipient_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 1 and 100),
  price integer not null check (price >= 0),
  image_path text not null,
  category text not null check (category in ('japanese', 'korean')),
  sizes text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 25),
  email text not null check (char_length(email) between 3 and 40),
  phone text not null check (char_length(phone) between 7 and 20),
  address text not null check (char_length(address) between 1 and 300),
  total integer not null check (total >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  size text not null check (size in ('S', 'M', 'L', 'XL')),
  quantity integer not null check (quantity between 1 and 10),
  unit_price integer not null check (unit_price >= 0)
);

insert into public.products (id, name, price, image_path, category, sizes, stock) values
  ('lovesick-girls', 'Lovesick Girls Tee', 190, 'img/products/f1.jpg', 'korean', array['S','M','L'], 0),
  ('consume', 'Consume Tee', 190, 'img/products/f2.jpg', 'japanese', array['M','L','XL'], 0),
  ('eren-yeager', 'Eren Yeager Tee', 220, 'img/products/f3.jpg', 'japanese', array['S','M','XL'], 0),
  ('anya-aesthetic', 'Anya Aesthetic Tee', 195, 'img/products/f4.jpg', 'japanese', array['S','M','L','XL'], 0),
  ('sung-jin-woo', 'Sung Jin Woo Y2K', 240, 'img/products/f5.jpg', 'korean', array['M','L','XL'], 0),
  ('kiss-me', 'Kiss Me Tee', 180, 'img/products/f6.jpg', 'korean', array['S','M'], 0),
  ('makima', 'Makima Tee', 230, 'img/products/f7.jpg', 'japanese', array['M','L','XL'], 0),
  ('gojo-satoru', 'Gojo Satoru Tee', 250, 'img/products/f8.jpg', 'japanese', array['S','L','XL'], 0),
  ('sukuna', 'Sukuna Tee', 210, 'img/products/n1.jpg', 'japanese', array['S','M','L'], 0),
  ('night-market', 'Night Market Tee', 225, 'img/products/n2.jpg', 'japanese', array['M','L','XL'], 0),
  ('midnight-spirit', 'Midnight Spirit Tee', 235, 'img/products/n3.jpg', 'japanese', array['S','M','XL'], 0),
  ('soft-signal', 'Soft Signal Tee', 195, 'img/products/n4.jpg', 'korean', array['S','M','L','XL'], 0),
  ('monochrome-city', 'Monochrome City Tee', 245, 'img/products/n5.jpg', 'japanese', array['M','L','XL'], 0),
  ('after-hours', 'After Hours Tee', 200, 'img/products/n6.jpg', 'korean', array['S','M','L'], 0),
  ('red-thread', 'Red Thread Tee', 250, 'img/products/n7.jpg', 'japanese', array['M','L','XL'], 0),
  ('blue-type', 'Blue Type Tee', 215, 'img/products/n8.jpg', 'korean', array['S','L','XL'], 0)
on conflict (id) do update set name = excluded.name, price = excluded.price, image_path = excluded.image_path, category = excluded.category, sizes = excluded.sizes, stock = excluded.stock;

delete from public.products p where p.id = 'seoul-club' and not exists (select 1 from public.order_items oi where oi.product_id = p.id);

alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can submit contact messages" on public.contact_messages;
create policy "Public can submit contact messages"
on public.contact_messages for insert to anon
with check (true);

drop policy if exists "Public can subscribe" on public.newsletter_subscribers;
create policy "Public can subscribe"
on public.newsletter_subscribers for insert to anon
with check (true);

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products for select to anon using (active = true);

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders" on public.orders for insert to anon with check (true);

drop policy if exists "Public can create order items" on public.order_items;
create policy "Public can create order items" on public.order_items for insert to anon with check (true);

-- No public select policy is created. Submitted data stays unreadable to visitors.
