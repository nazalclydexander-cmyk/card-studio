insert into public.categories (name, slug, description, sort_order, active)
values
  ('Wedding Invitations', 'wedding-invitations', 'Invitation designs for weddings and wedding-related celebrations.', 1, true),
  ('Birthday Invitations', 'birthday-invitations', 'Invitation designs for birthday celebrations and parties.', 2, true),
  ('Christening Invitations', 'christening-invitations', 'Invitation designs for baptisms, christenings, and similar events.', 3, true),
  ('Debut Invitations', 'debut-invitations', 'Invitation designs for debut celebrations and formal coming-of-age events.', 4, true),
  ('Greeting Cards', 'greeting-cards', 'Card designs for seasonal, personal, and all-occasion greetings.', 5, true),
  ('Thank You Cards', 'thank-you-cards', 'Card designs intended for thank-you messages and appreciation notes.', 6, true),
  ('Save the Date', 'save-the-date', 'Card designs used to announce and reserve event dates in advance.', 7, true),
  ('Other Invitations', 'other-invitations', 'A catch-all category for invitation designs outside the main catalog groups.', 8, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
