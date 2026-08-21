begin;

alter table public.product_images
  add column if not exists preview_path text;

alter table public.product_images
  drop constraint if exists product_images_preview_path_not_blank;

alter table public.product_images
  add constraint product_images_preview_path_not_blank check (
    preview_path is null or btrim(preview_path) <> ''
  );

comment on column public.product_images.storage_path is
  'Publicly served storage path. Legacy rows may point to the old product-images bucket until backfilled. Protected rows should store the generated preview path here for storefront compatibility.';

comment on column public.product_images.preview_path is
  'Public lower-resolution watermarked preview path used by the storefront.';

create table if not exists public.product_image_originals (
  product_image_id uuid primary key
    references public.product_images(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint product_image_originals_storage_path_not_blank check (
    btrim(storage_path) <> ''
  )
);

create index if not exists product_images_preview_path_idx
  on public.product_images (preview_path)
  where preview_path is not null;

create index if not exists product_image_originals_storage_path_idx
  on public.product_image_originals (storage_path);

alter table public.product_image_originals enable row level security;

revoke all on table public.product_image_originals from anon, authenticated;
grant select, insert, update, delete on table public.product_image_originals to authenticated;

drop policy if exists "Admins can manage product image originals" on public.product_image_originals;

create policy "Admins can manage product image originals"
on public.product_image_originals
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-originals',
  'product-originals',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-previews',
  'product-previews',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant select, insert, update, delete on table storage.objects to authenticated;

drop policy if exists "Admins can read product originals" on storage.objects;
drop policy if exists "Admins can upload product originals" on storage.objects;
drop policy if exists "Admins can update product originals" on storage.objects;
drop policy if exists "Admins can delete product originals" on storage.objects;
drop policy if exists "Admins can upload product previews" on storage.objects;
drop policy if exists "Admins can update product previews" on storage.objects;
drop policy if exists "Admins can delete product previews" on storage.objects;

create policy "Admins can read product originals"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-originals'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);

create policy "Admins can upload product originals"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-originals'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.products
    where id::text = (storage.foldername(storage.objects.name))[2]
  )
);

create policy "Admins can update product originals"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-originals'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
with check (
  bucket_id = 'product-originals'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.products
    where id::text = (storage.foldername(storage.objects.name))[2]
  )
);

create policy "Admins can delete product originals"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-originals'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);

create policy "Admins can upload product previews"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-previews'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.products
    where id::text = (storage.foldername(storage.objects.name))[2]
  )
);

create policy "Admins can update product previews"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-previews'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
with check (
  bucket_id = 'product-previews'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.products
    where id::text = (storage.foldername(storage.objects.name))[2]
  )
);

create policy "Admins can delete product previews"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-previews'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);

commit;
