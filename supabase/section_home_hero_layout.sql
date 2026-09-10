-- Hero layout controls for the homepage, managed from Admin > Home > Hero Content.
--
--   profile_image_scale : width of the profile image as a percent of its card (25-100).
--   hero_content_width   : width of the hero text block - 'sm' | 'md' | 'lg'.

alter table public.section_home
  add column if not exists profile_image_scale smallint not null default 100;

alter table public.section_home
  add column if not exists hero_content_width text not null default 'md';

alter table public.section_home
  drop constraint if exists section_home_profile_image_scale_check;
alter table public.section_home
  add constraint section_home_profile_image_scale_check
  check (profile_image_scale between 25 and 100);

alter table public.section_home
  drop constraint if exists section_home_hero_content_width_check;
alter table public.section_home
  add constraint section_home_hero_content_width_check
  check (hero_content_width in ('sm', 'md', 'lg'));
