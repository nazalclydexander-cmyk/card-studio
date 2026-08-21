begin;

alter table public.customer_inquiries
  add column if not exists submitter_timezone text,
  add column if not exists submitter_utc_offset_minutes integer;

alter table public.customer_inquiries
  add constraint customer_inquiries_submitter_timezone_not_blank check (
    submitter_timezone is null or btrim(submitter_timezone) <> ''
  );

alter table public.customer_inquiries
  add constraint customer_inquiries_submitter_utc_offset_minutes_range check (
    submitter_utc_offset_minutes is null
    or submitter_utc_offset_minutes between -840 and 840
  );

grant insert (
  submitter_timezone,
  submitter_utc_offset_minutes
)
on table public.customer_inquiries
to anon, authenticated;

commit;
