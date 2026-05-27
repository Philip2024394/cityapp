-- ============================================================================
-- 0102 — Place cuisine types
-- ----------------------------------------------------------------------------
-- Restaurants, cafés, bars, food-vendors etc. can list the cuisines they
-- serve. Rendered as small pill chips under the About card on
-- /places/[slug]. Non-food places (temple, mall, salon, etc.) just leave
-- the array empty and the row stays hidden.
--
-- Array column so a place can list multiple ("Indonesian", "Javanese",
-- "Halal", "Vegetarian", etc.). No CHECK constraint — leaving the
-- vocabulary open so venues can self-describe.
-- ============================================================================

alter table public.places
  add column if not exists cuisine_types text[] not null default '{}'::text[];

comment on column public.places.cuisine_types is
  'Self-listed cuisine tags for food venues. Free-text array — common '
  'entries: Indonesian, Javanese, Halal, Vegetarian, Asian, Western, '
  'Italian, Japanese, Chinese, Seafood, Street food, Cafe, Cocktails. '
  'Empty array (default) for non-food places.';

-- Seed the existing food mocks with sensible cuisines so the chips
-- render immediately on the warung / bar / boutique profile pages.
update public.places
   set cuisine_types = array['Indonesian','Javanese','Halal','Lokal']::text[]
 where slug = 'warung-bu-tini-yogya-mock'
   and cuisine_types = '{}'::text[];

update public.places
   set cuisine_types = array['Cocktails','Western','Bar Bites','Live Music']::text[]
 where slug = 'lava-lounge-bar-seminyak-mock'
   and cuisine_types = '{}'::text[];

-- Temple + boutique stay with empty arrays — non-food categories.
