-- Per-section visibility control for the public homepage, managed from
-- Admin > Home > Homepage Sections.
--
-- homepage_sections is a JSON object keyed by section slug, e.g.
--   { "portfolio": true, "certifications": false, "blog": true }
-- A missing key is treated as visible, so an empty object shows everything.

alter table public.section_home
  add column if not exists homepage_sections jsonb not null default '{}'::jsonb;

-- Drop the earlier single "hide everything" toggle if it was applied.
alter table public.section_home
  drop column if exists hide_other_sections;
