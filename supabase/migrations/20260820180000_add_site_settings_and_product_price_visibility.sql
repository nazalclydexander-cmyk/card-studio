begin;

alter table public.products
add column if not exists show_price boolean not null default true;

create table if not exists public.site_settings (
  id boolean primary key default true,
  site_name text not null,
  tagline text not null,
  logo_path text,
  primary_color text not null default '#8C5E58',
  secondary_color text not null default '#D9C7B8',
  accent_color text not null default '#B76E79',
  background_color text not null default '#FAF7F2',
  surface_color text not null default '#FFFFFF',
  text_color text not null default '#2F2522',
  muted_text_color text not null default '#6B625C',
  heading_font text not null default 'georgia',
  body_font text not null default 'arial',
  card_radius text not null default '1rem',
  button_radius text not null default '0.75rem',
  show_prices boolean not null default true,
  currency_code text not null default 'PHP',
  hidden_price_label text not null default 'Contact for pricing',
  hero_title text not null default 'Invitation designs for every meaningful celebration',
  hero_subtitle text not null default 'Browse elegant, customizable cards for weddings, birthdays, christenings, debuts, and more.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id is true),
  constraint site_settings_site_name_not_blank check (btrim(site_name) <> ''),
  constraint site_settings_tagline_not_blank check (btrim(tagline) <> ''),
  constraint site_settings_logo_path_not_blank check (
    logo_path is null or btrim(logo_path) <> ''
  ),
  constraint site_settings_primary_color_format check (
    primary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint site_settings_secondary_color_format check (
    secondary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint site_settings_accent_color_format check (
    accent_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint site_settings_background_color_format check (
    background_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint site_settings_surface_color_format check (
    surface_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint site_settings_text_color_format check (
    text_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint site_settings_muted_text_color_format check (
    muted_text_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint site_settings_heading_font_allowed check (
    heading_font in (
      'geist',
      'georgia',
      'times_new_roman',
      'arial',
      'trebuchet_ms'
    )
  ),
  constraint site_settings_body_font_allowed check (
    body_font in (
      'geist',
      'georgia',
      'times_new_roman',
      'arial',
      'trebuchet_ms'
    )
  ),
  constraint site_settings_card_radius_format check (
    card_radius ~ '^[0-9]+(\.[0-9]+)?(px|rem)$'
  ),
  constraint site_settings_button_radius_format check (
    button_radius ~ '^[0-9]+(\.[0-9]+)?(px|rem)$'
  ),
  constraint site_settings_currency_code_format check (
    currency_code ~ '^[A-Z]{3}$'
  ),
  constraint site_settings_hidden_price_label_not_blank check (
    btrim(hidden_price_label) <> ''
  ),
  constraint site_settings_hero_title_not_blank check (
    btrim(hero_title) <> ''
  ),
  constraint site_settings_hero_subtitle_not_blank check (
    btrim(hero_subtitle) <> ''
  )
);

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row
execute function private.set_updated_at();

alter table public.site_settings enable row level security;

revoke all on table public.site_settings from anon, authenticated;
grant select on table public.site_settings to anon, authenticated;

create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (id is true);

insert into public.site_settings (
  id,
  site_name,
  tagline,
  logo_path,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  surface_color,
  text_color,
  muted_text_color,
  heading_font,
  body_font,
  card_radius,
  button_radius,
  show_prices,
  currency_code,
  hidden_price_label,
  hero_title,
  hero_subtitle
)
values (
  true,
  'Card Studio',
  'Elegant invitation and greeting cards for life''s meaningful moments.',
  null,
  '#8C5E58',
  '#D9C7B8',
  '#B76E79',
  '#FAF7F2',
  '#FFFFFF',
  '#2F2522',
  '#6B625C',
  'georgia',
  'arial',
  '1rem',
  '0.75rem',
  true,
  'PHP',
  'Contact for pricing',
  'Invitation designs for every meaningful celebration',
  'Browse elegant, customizable cards for weddings, birthdays, christenings, debuts, and more.'
)
on conflict (id) do update
set
  site_name = excluded.site_name,
  tagline = excluded.tagline,
  logo_path = excluded.logo_path,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color,
  background_color = excluded.background_color,
  surface_color = excluded.surface_color,
  text_color = excluded.text_color,
  muted_text_color = excluded.muted_text_color,
  heading_font = excluded.heading_font,
  body_font = excluded.body_font,
  card_radius = excluded.card_radius,
  button_radius = excluded.button_radius,
  show_prices = excluded.show_prices,
  currency_code = excluded.currency_code,
  hidden_price_label = excluded.hidden_price_label,
  hero_title = excluded.hero_title,
  hero_subtitle = excluded.hero_subtitle,
  updated_at = now();

commit;
