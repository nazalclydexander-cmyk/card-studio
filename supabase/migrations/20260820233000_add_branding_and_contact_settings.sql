begin;

alter table public.site_settings
add column if not exists contact_email text,
add column if not exists contact_phone text,
add column if not exists business_address text,
add column if not exists facebook_url text,
add column if not exists instagram_url text;

alter table public.site_settings
drop constraint if exists site_settings_contact_email_format,
drop constraint if exists site_settings_contact_phone_not_blank,
drop constraint if exists site_settings_contact_phone_length,
drop constraint if exists site_settings_business_address_not_blank,
drop constraint if exists site_settings_business_address_length,
drop constraint if exists site_settings_facebook_url_format,
drop constraint if exists site_settings_instagram_url_format;

alter table public.site_settings
add constraint site_settings_contact_email_format check (
  contact_email is null
  or contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
),
add constraint site_settings_contact_phone_not_blank check (
  contact_phone is null or btrim(contact_phone) <> ''
),
add constraint site_settings_contact_phone_length check (
  contact_phone is null or char_length(contact_phone) <= 40
),
add constraint site_settings_business_address_not_blank check (
  business_address is null or btrim(business_address) <> ''
),
add constraint site_settings_business_address_length check (
  business_address is null or char_length(business_address) <= 500
),
add constraint site_settings_facebook_url_format check (
  facebook_url is null
  or facebook_url ~* '^https://([a-z0-9-]+\.)*facebook\.com(/.*)?$'
),
add constraint site_settings_instagram_url_format check (
  instagram_url is null
  or instagram_url ~* '^https://([a-z0-9-]+\.)*instagram\.com(/.*)?$'
);

update public.site_settings
set
  contact_email = null,
  contact_phone = null,
  business_address = null,
  facebook_url = null,
  instagram_url = null
where id is true
  and (
    contact_email is distinct from null
    or contact_phone is distinct from null
    or business_address is distinct from null
    or facebook_url is distinct from null
    or instagram_url is distinct from null
  );

commit;
