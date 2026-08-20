begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

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

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table if not exists public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_sort_order_nonnegative check (sort_order >= 0)
);

create table if not exists public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price_from numeric(10,2),
  theme text,
  orientation text,
  format text,
  customizable boolean not null default true,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_price_from_nonnegative check (
    price_from is null or price_from >= 0
  ),
  constraint products_short_description_not_blank check (
    short_description is null or btrim(short_description) <> ''
  ),
  constraint products_description_not_blank check (
    description is null or btrim(description) <> ''
  ),
  constraint products_theme_not_blank check (
    theme is null or btrim(theme) <> ''
  ),
  constraint products_orientation_allowed check (
    orientation is null or orientation in ('portrait', 'landscape', 'square')
  ),
  constraint products_format_not_blank check (
    format is null or btrim(format) <> ''
  )
);

create table if not exists public.product_images (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_storage_path_not_blank check (
    btrim(storage_path) <> ''
  ),
  constraint product_images_alt_text_not_blank check (
    alt_text is null or btrim(alt_text) <> ''
  ),
  constraint product_images_sort_order_nonnegative check (sort_order >= 0),
  constraint product_images_product_storage_path_unique unique (product_id, storage_path)
);

create table if not exists public.customer_inquiries (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  customer_name text not null,
  email text,
  phone text,
  event_date date,
  quantity integer,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_inquiries_customer_name_not_blank check (
    btrim(customer_name) <> ''
  ),
  constraint customer_inquiries_email_format check (
    email is null
    or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  constraint customer_inquiries_phone_not_blank check (
    phone is null or btrim(phone) <> ''
  ),
  constraint customer_inquiries_quantity_positive check (
    quantity is null or quantity > 0
  ),
  constraint customer_inquiries_message_not_blank check (
    btrim(message) <> ''
  ),
  constraint customer_inquiries_status_allowed check (
    status in ('new', 'reviewed', 'contacted', 'quoted', 'closed')
  )
);

create index if not exists categories_active_sort_order_idx
  on public.categories (active, sort_order, name);

create index if not exists products_category_id_idx
  on public.products (category_id);

create index if not exists products_category_active_featured_idx
  on public.products (category_id, active, featured, name);

create index if not exists products_active_created_at_idx
  on public.products (active, created_at desc);

create index if not exists product_images_product_id_idx
  on public.product_images (product_id);

create index if not exists product_images_product_sort_order_idx
  on public.product_images (product_id, sort_order, created_at);

create unique index if not exists product_images_one_primary_per_product_idx
  on public.product_images (product_id)
  where is_primary is true;

create index if not exists customer_inquiries_product_id_idx
  on public.customer_inquiries (product_id);

create index if not exists customer_inquiries_status_created_at_idx
  on public.customer_inquiries (status, created_at desc);

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function private.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function private.set_updated_at();

drop trigger if exists set_customer_inquiries_updated_at on public.customer_inquiries;
create trigger set_customer_inquiries_updated_at
before update on public.customer_inquiries
for each row
execute function private.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customer_inquiries enable row level security;

revoke all on table public.categories from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_images from anon, authenticated;
revoke all on table public.customer_inquiries from anon, authenticated;

grant select on table public.categories to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.product_images to anon, authenticated;

create policy "Public can read active categories"
on public.categories
for select
to anon, authenticated
using (active is true);

create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (active is true);

create policy "Public can read images for active products"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.active is true
  )
);

commit;
