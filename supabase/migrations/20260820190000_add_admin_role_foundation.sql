begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create policy "Users can read their own admin membership"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));

grant insert, update, delete on table public.categories to authenticated;
grant insert, update, delete on table public.products to authenticated;
grant insert, update, delete on table public.product_images to authenticated;
grant update on table public.site_settings to authenticated;

create policy "Admins can manage categories"
on public.categories
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can manage products"
on public.products
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can manage product images"
on public.product_images
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can update site settings"
on public.site_settings
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

commit;
