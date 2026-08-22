begin;

alter table public.product_images
  add column if not exists preview_updated_at timestamptz not null default now();

update public.product_images
set preview_updated_at = coalesce(preview_updated_at, created_at, now())
where preview_updated_at is null;

comment on column public.product_images.preview_updated_at is
  'Version timestamp for cache-busting public protected preview URLs when preview objects are regenerated in place.';

commit;
