-- ============================================================================
-- 0121 — Add mock_hidden_at to places + hide non-template food entries
-- ----------------------------------------------------------------------------
-- The template-only pivot (2026-05-29) requires every category to render
-- exactly one polished demo. The `places` table backs /food (restaurant +
-- cafe + bar + club) and /places. It has no mock flag yet — adding one
-- mirrors the provider-table pattern (mig 0049). The /food query will
-- start filtering `mock_hidden_at is null` so only the template card
-- (warung-bu-tini-yogya-mock) renders.
-- The other ~150 non-food places (attractions, hotels, hospitals, etc.)
-- are NOT hidden here — they still appear on /places. Separate decision.
-- ============================================================================

alter table public.places
  add column if not exists mock_hidden_at timestamptz;

update public.places
   set mock_hidden_at = now()
 where mock_hidden_at is null
   and category in ('restaurant','cafe','bar','club')
   and slug <> 'warung-bu-tini-yogya-mock';
