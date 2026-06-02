-- ============================================================================
-- 0179_provider_profile_views_utm.sql — capture UTM params on profile views
-- ----------------------------------------------------------------------------
-- The H4 audit flagged that admin analytics could not distinguish "where
-- did this campaign traffic come from?" because we only stored a coarse
-- `source` enum ('direct'|'wa_share'|'social'|'qr'). Real campaigns ship
-- UTM tags. This migration adds them as nullable columns so:
--   - existing rows keep working (no backfill needed)
--   - tracker captures whatever is present in the URL at view time
--   - admin can aggregate top campaigns / mediums / sources
--
-- PDP posture: UTM params are anonymous traffic attribution — never PII.
-- They live alongside the existing anon_session_id pattern.
-- ============================================================================

alter table public.provider_profile_views
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text;

-- Index the most-likely aggregation columns for the admin source-breakdown.
-- utm_campaign is the high-cardinality drill-down; utm_source + utm_medium
-- are the coarse buckets shown first.
create index if not exists ppv_utm_source_idx
  on public.provider_profile_views (utm_source)
  where utm_source is not null;

create index if not exists ppv_utm_campaign_idx
  on public.provider_profile_views (utm_campaign)
  where utm_campaign is not null;

comment on column public.provider_profile_views.utm_source is
  'Campaign attribution — captured from the visitor URL by useProfileViewTracker. '
  'No PII. Null when the visitor arrived without UTM tags.';
