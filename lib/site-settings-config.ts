export type SiteSettings = {
  site_name: string;
  tagline: string;
  logo_path: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  muted_text_color: string;
  heading_font: string;
  body_font: string;
  card_radius: string;
  button_radius: string;
  show_prices: boolean;
  currency_code: string;
  hidden_price_label: string;
  hero_title: string;
  hero_subtitle: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: "Card Studio",
  tagline: "Elegant invitation and greeting cards for life's meaningful moments.",
  logo_path: null,
  contact_email: null,
  contact_phone: null,
  business_address: null,
  facebook_url: null,
  instagram_url: null,
  primary_color: "#8C5E58",
  secondary_color: "#D9C7B8",
  accent_color: "#B76E79",
  background_color: "#FAF7F2",
  surface_color: "#FFFFFF",
  text_color: "#2F2522",
  muted_text_color: "#6B625C",
  heading_font: "georgia",
  body_font: "arial",
  card_radius: "1rem",
  button_radius: "0.75rem",
  show_prices: true,
  currency_code: "PHP",
  hidden_price_label: "Contact for pricing",
  hero_title: "Invitation designs for every meaningful celebration",
  hero_subtitle:
    "Browse elegant, customizable cards for weddings, birthdays, christenings, debuts, and more.",
};
