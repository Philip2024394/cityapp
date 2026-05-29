-- ============================================================================
-- 0112 — Backport gallery/promo/business_name onto demo-bp-ayu
-- ----------------------------------------------------------------------------
-- Ayu was the original nails-focused beautician template (mig 0058 era).
-- The 2026-05-29 standard-profile checklist requires gallery_image_urls,
-- promo_text, and business_name to match Dewi (mig 0111). This migration
-- backfills those three fields only — Ayu's hero_text, service_photos,
-- pricing, and social URLs stay as-is.
-- ============================================================================

update public.beautician_providers set
  business_name      = 'Ayu Nail Bar',
  promo_text         = 'Free brow shaping with any gel nail set this week — book by Sunday.',
  gallery_image_urls = ARRAY[
    'https://images.unsplash.com/photo-1632345031435-8727f6897d53',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371',
    'https://images.unsplash.com/photo-1610992015762-45dca7fa3a85',
    'https://images.unsplash.com/photo-1630843599725-32ead7671867',
    'https://images.unsplash.com/photo-1709477542149-f4e0e21d590b',
    'https://images.unsplash.com/photo-1636023730877-233b9237d4ec'
  ],
  updated_at         = now()
where slug = 'demo-bp-ayu' and is_mock = true;
