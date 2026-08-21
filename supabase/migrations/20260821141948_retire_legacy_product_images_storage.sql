begin;

do $$
begin
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'product-images'
  ) then
    raise exception 'Cannot retire product-images: legacy objects remain';
  end if;
end
$$;

drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;
drop policy if exists "Admins can read legacy product images" on storage.objects;

commit;
