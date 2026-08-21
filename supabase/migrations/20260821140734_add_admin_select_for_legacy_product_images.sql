begin;

drop policy if exists "Admins can read legacy product images" on storage.objects;

create policy "Admins can read legacy product images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
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

commit;
