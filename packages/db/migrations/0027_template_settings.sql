-- docs/specs/invoice-templates.md: a business's own second colour (null: worked out from the brand colour) and what
-- sits behind its logo where a template sets the logo on a colour. Issued documents record both in their snapshot.

alter table organisation
  add column accent_colour text check (accent_colour ~ '^#[0-9a-fA-F]{6}$'),
  add column logo_ground text not null default 'white' check (logo_ground in ('none', 'white', 'cream', 'black'));
