begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant insert, update, delete on table storage.objects to authenticated;

create policy "Admins can upload site assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-assets'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'branding'
  and (storage.foldername(name))[2] = 'logo'
);

create policy "Admins can update site assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-assets'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'branding'
  and (storage.foldername(name))[2] = 'logo'
)
with check (
  bucket_id = 'site-assets'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'branding'
  and (storage.foldername(name))[2] = 'logo'
);

create policy "Admins can delete site assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-assets'
  and (select private.is_admin())
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = 'branding'
  and (storage.foldername(name))[2] = 'logo'
);

commit;
