begin;

grant insert (
  product_id,
  customer_name,
  email,
  phone,
  event_date,
  quantity,
  message
)
on table public.customer_inquiries
to anon, authenticated;

grant select on table public.customer_inquiries to authenticated;
grant update (status) on table public.customer_inquiries to authenticated;

create policy "Public can submit customer inquiries"
on public.customer_inquiries
for insert
to anon, authenticated
with check (
  (
    product_id is null
    or exists (
      select 1
      from public.products
      where products.id = customer_inquiries.product_id
        and products.active is true
    )
  )
  and (
    email is not null
    or phone is not null
  )
);

create policy "Admins can read customer inquiries"
on public.customer_inquiries
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can update inquiry status"
on public.customer_inquiries
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create index if not exists customer_inquiries_created_at_idx
  on public.customer_inquiries (created_at desc);

commit;
