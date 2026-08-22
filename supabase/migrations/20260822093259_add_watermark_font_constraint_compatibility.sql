begin;

alter table public.site_settings
  drop constraint if exists site_settings_watermark_font_allowed;

alter table public.site_settings
  add constraint site_settings_watermark_font_allowed check (
    watermark_font in (
      'arial',
      'helvetica',
      'trebuchet_ms',
      'georgia',
      'times_new_roman',
      'inter',
      'libre_baskerville'
    )
  );

commit;
