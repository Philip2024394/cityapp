-- Sets cover_image_url on each demo tukang to the trade banner that
-- matches their primary specialty. Re-runnable.

update public.handyman_providers
set cover_image_url = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_46_51%20PM.png'
where slug = 'demo-hp-pak-joko';

update public.handyman_providers
set cover_image_url = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_49_10%20PM.png'
where slug = 'demo-hp-pak-eko';

update public.handyman_providers
set cover_image_url = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_42_54%20PM.png'
where slug = 'demo-hp-pak-budi';

update public.handyman_providers
set cover_image_url = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_39_50%20PM.png'
where slug = 'demo-hp-mas-andi';
