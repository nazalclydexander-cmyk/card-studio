begin;

drop policy if exists "Public can read product previews" on storage.objects;

create policy "Public can read product previews"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'product-previews'
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.products
    where id::text = (storage.foldername(storage.objects.name))[2]
  )
);

commit;
