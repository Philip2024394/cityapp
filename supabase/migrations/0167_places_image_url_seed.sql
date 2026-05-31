-- =============================================================================
-- 0167 — places.image_url seed (top tour destinations)
-- =============================================================================
-- Founder spec 2026-05-31: populate image_url for places referenced by jeep
-- tour templates so the new tour-card thumbnail cascade has something to
-- render. URLs are the founder-supplied jeep banner art (uploaded to
-- ImageKit) repurposed as destination photos — visually distinct, on-brand,
-- and overridable later when destination-specific photography lands.
-- =============================================================================

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_44_53%20AM.png'
  where slug = 'bunker-kaliadem';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_45_41%20AM.png'
  where slug = 'batu-alien';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_47_17%20AM.png'
  where slug = 'merapi-lava-tour';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_49_12%20AM.png'
  where slug = 'gunung-merapi';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_50_01%20AM.png'
  where slug = 'goa-pindul';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_52_32%20AM.png'
  where slug = 'air-terjun-sri-gethuk';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_55_24%20AM.png'
  where slug = 'timang-beach';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_58_34%20AM.png'
  where slug = 'pok-tunggal-beach';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_59_52%20AM.png'
  where slug = 'indrayanti-beach';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_02_06%20PM.png'
  where slug = 'goa-jomblang';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_04_17%20PM.png'
  where slug = 'kalisuci-cave-tubing';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_05_47%20PM.png'
  where slug = 'the-lost-world-castle';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_07_19%20PM.png'
  where slug = 'kaliurang';

update public.places set image_url =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_08_55%20PM.png'
  where slug = 'parangtritis-beach';
