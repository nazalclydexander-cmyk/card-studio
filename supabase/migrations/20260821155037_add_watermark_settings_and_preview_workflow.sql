begin;

alter table public.site_settings
  add column if not exists watermark_enabled boolean not null default true,
  add column if not exists watermark_text text not null default 'PREVIEW',
  add column if not exists watermark_font text not null default 'arial',
  add column if not exists watermark_mode text not null default 'adaptive',
  add column if not exists watermark_color text not null default '#60544C',
  add column if not exists watermark_light_color text not null default '#F8F4EE',
  add column if not exists watermark_dark_color text not null default '#60544C',
  add column if not exists watermark_opacity numeric(4, 2) not null default 0.20,
  add column if not exists watermark_rotation integer not null default -30,
  add column if not exists watermark_font_scale numeric(4, 2) not null default 1.00,
  add column if not exists watermark_spacing_x integer not null default 100,
  add column if not exists watermark_spacing_y integer not null default 100,
  add column if not exists watermark_repeat boolean not null default true;

alter table public.site_settings
  drop constraint if exists site_settings_watermark_text_not_blank,
  drop constraint if exists site_settings_watermark_text_length,
  drop constraint if exists site_settings_watermark_font_allowed,
  drop constraint if exists site_settings_watermark_mode_allowed,
  drop constraint if exists site_settings_watermark_color_format,
  drop constraint if exists site_settings_watermark_light_color_format,
  drop constraint if exists site_settings_watermark_dark_color_format,
  drop constraint if exists site_settings_watermark_opacity_range,
  drop constraint if exists site_settings_watermark_rotation_range,
  drop constraint if exists site_settings_watermark_font_scale_range,
  drop constraint if exists site_settings_watermark_spacing_x_range,
  drop constraint if exists site_settings_watermark_spacing_y_range;

alter table public.site_settings
  add constraint site_settings_watermark_text_not_blank check (
    watermark_enabled is false or btrim(watermark_text) <> ''
  ),
  add constraint site_settings_watermark_text_length check (
    char_length(watermark_text) <= 40
  ),
  add constraint site_settings_watermark_font_allowed check (
    watermark_font in (
      'arial',
      'helvetica',
      'georgia',
      'times_new_roman',
      'trebuchet_ms'
    )
  ),
  add constraint site_settings_watermark_mode_allowed check (
    watermark_mode in ('manual', 'adaptive')
  ),
  add constraint site_settings_watermark_color_format check (
    watermark_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  add constraint site_settings_watermark_light_color_format check (
    watermark_light_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  add constraint site_settings_watermark_dark_color_format check (
    watermark_dark_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  add constraint site_settings_watermark_opacity_range check (
    watermark_opacity >= 0.05 and watermark_opacity <= 0.50
  ),
  add constraint site_settings_watermark_rotation_range check (
    watermark_rotation between -60 and 60
  ),
  add constraint site_settings_watermark_font_scale_range check (
    watermark_font_scale >= 0.60 and watermark_font_scale <= 1.80
  ),
  add constraint site_settings_watermark_spacing_x_range check (
    watermark_spacing_x between 60 and 180
  ),
  add constraint site_settings_watermark_spacing_y_range check (
    watermark_spacing_y between 60 and 180
  );

comment on column public.site_settings.watermark_enabled is
  'Controls whether newly generated product previews include a burned-in watermark.';

comment on column public.site_settings.watermark_mode is
  'manual uses the configured color directly; adaptive chooses between light/dark configured colors based on artwork brightness.';

update public.site_settings
set
  watermark_enabled = coalesce(watermark_enabled, true),
  watermark_text = coalesce(nullif(btrim(watermark_text), ''), 'PREVIEW'),
  watermark_font = coalesce(nullif(btrim(watermark_font), ''), 'arial'),
  watermark_mode = coalesce(nullif(btrim(watermark_mode), ''), 'adaptive'),
  watermark_color = coalesce(nullif(btrim(watermark_color), ''), '#60544C'),
  watermark_light_color = coalesce(nullif(btrim(watermark_light_color), ''), '#F8F4EE'),
  watermark_dark_color = coalesce(nullif(btrim(watermark_dark_color), ''), '#60544C'),
  watermark_opacity = coalesce(watermark_opacity, 0.20),
  watermark_rotation = coalesce(watermark_rotation, -30),
  watermark_font_scale = coalesce(watermark_font_scale, 1.00),
  watermark_spacing_x = coalesce(watermark_spacing_x, 100),
  watermark_spacing_y = coalesce(watermark_spacing_y, 100),
  watermark_repeat = coalesce(watermark_repeat, true)
where id is true;

commit;
