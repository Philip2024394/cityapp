-- ============================================================================
-- 0132 — Multi-platform chat handles (Telegram, WeChat, Line, KakaoTalk)
-- ----------------------------------------------------------------------------
-- WhatsApp stays primary (existing whatsapp_e164 column). Four additional
-- optional handles cover the realistic chat-app footprint for Indonesian
-- providers serving Chinese / Korean / Japanese / Thai / Western tourists:
--
--   telegram_handle   — Western + crypto crowd. Accepts '@handle',
--                       't.me/handle' URL, or '+phone'.
--   wechat_id         — Chinese tourists. WeChat ID (alphanumeric +
--                       underscore).
--   line_id           — Japanese / Thai / Taiwanese. Line ID.
--   kakaotalk_id      — Korean tourists. Kakao ID.
--
-- All four are nullable text columns, max 60 chars enforced by the
-- shared validator (src/lib/validation/universalProfile.ts). Public
-- profile renders a conditional icon button for each handle that is
-- non-empty, identical pattern to the social-media row from mig 0130.
-- ============================================================================

alter table public.bike_rentals
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

alter table public.tour_guide_listings
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

alter table public.massage_providers
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

alter table public.beautician_providers
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

alter table public.laundry_providers
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

alter table public.handyman_providers
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

alter table public.home_clean_providers
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

-- ============================================================================
-- POST-CONDITIONS
--   • All 7 provider tables carry the 4 new chat-handle columns alongside
--     the existing whatsapp_e164. Together with the social URLs from
--     mig 0130, the public profile can render up to 9 contact / social
--     buttons (WhatsApp + Telegram + WeChat + Line + Kakao + IG + TikTok
--     + Facebook + X + Snapchat + Website = 11), conditionally.
--   • No RLS changes — new columns inherit existing row policies.
--   • Validator needs the matching trim() + length cap (max 60) and a
--     loose accept regex per platform — see updated SOCIAL_HOST_RE.
-- ============================================================================
