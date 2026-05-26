-- Replace Rina's Bridal Hair carousel image with the founder-supplied URL.
-- Guarded so we only update if the entry at hair[3] really is Bridal Hair
-- (in case the array order changes later).

update public.beautician_providers
set service_photos = jsonb_set(
  service_photos,
  '{hair,3,url}',
  '"https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdadasdasasdasd.png"'::jsonb
)
where slug = 'demo-bp-rina'
  and service_photos -> 'hair' -> 3 ->> 'name' = 'Bridal Hair';
