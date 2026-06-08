-- ============================================================================
-- 0209 — Seed PortfolioCarousel for the three new lifestyle demos
-- ----------------------------------------------------------------------------
-- migs 0206/0207/0208 introduced tattoo/barber/photo verticals cloned from
-- handyman_providers (flat JSONB array of {name, description, price_idr, url}
-- entries — distinct from beautician's object-keyed shape). The three demo
-- providers seeded by those migs ship with service_photos = '[]', so the
-- PortfolioCarousel on /tattoo/p/[slug], /barber/p/[slug], /photo/p/[slug]
-- renders nothing.
--
-- This mig fills each with 4 category-appropriate entries (Indonesian copy
-- ≤180 chars, Yogya context, WhatsApp/deposit/turnaround mentions where
-- natural). Photo URLs are Unsplash CDN, all HEAD-verified 200 OK image/jpeg
-- on 2026-06-08, and every URL is unique across all 12 entries.
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================

-- ---- Tattoo (demo-tattoo-rama, Yogya, fineline + blackwork + traditional) --
update public.tattoo_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1552627019-947c3789ffb5',
      'name',        'Fineline Custom',
      'description', 'Single-needle fineline custom design, garis tipis presisi. Healed sempurna dalam 2 minggu, free touch-up sekali.',
      'price_idr',   800000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28',
      'name',        'Blackwork Full Sleeve',
      'description', 'Full sleeve blackwork tinta solid, 3–4 sesi (8 jam/sesi). DP Rp 1jt via WhatsApp untuk booking slot di studio Jogja.',
      'price_idr',   4500000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd',
      'name',        'Traditional Indonesian Motif',
      'description', 'Motif tradisional wayang, batik, dan relief candi Prambanan/Borobudur. Konsultasi desain custom dulu lewat WhatsApp.',
      'price_idr',   1800000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1526893299283-37e82b1e4da5',
      'name',        'Cover-Up Specialist',
      'description', 'Tutup tato lama dengan desain baru — blackwork atau ornamental. Konsultasi gratis di studio Jogja, kirim foto via WhatsApp.',
      'price_idr',   2500000
    )
  ),
  updated_at = now()
where slug = 'demo-tattoo-rama';

-- ---- Barber (demo-barber-bagas, Yogya, classic barbershop) ------------------
update public.barber_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1503951914875-452162b0f3f1',
      'name',        'Classic Cut + Hot Towel',
      'description', 'Potong rambut presisi pakai gunting + finishing hot towel & tonik. Cocok untuk gaya pomade klasik. Walk-in welcome di Jogja.',
      'price_idr',   65000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1585747860715-2ba37e788b70',
      'name',        'Skin Fade',
      'description', 'High, mid, atau low fade — clipper-over-comb dengan transisi smooth. Kami sarankan refresh tiap 2 minggu biar tetap tajam.',
      'price_idr',   80000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1517832606299-7ae9b720a186',
      'name',        'Beard Trim & Shape',
      'description', 'Trim & shaping jenggot pakai straight razor, plus mustache wax. Cocok untuk styling tipis maupun full beard.',
      'price_idr',   30000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1647140655214-e4a2d914971f',
      'name',        'Cut + Beard Combo',
      'description', 'Paket lengkap potong rambut + beard trim + hot towel. Kursi anak tersedia, bawa si kecil sekalian. Book via WhatsApp.',
      'price_idr',   100000
    )
  ),
  updated_at = now()
where slug = 'demo-barber-bagas';

-- ---- Photo (demo-photo-arka, Yogya, wedding + product + headshot) ----------
update public.photo_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1520854221256-17451cc331bf',
      'name',        'Wedding Documentation',
      'description', 'Full-day coverage akad sampai resepsi, 200+ foto edit warna sinematik. Turnaround 14 hari. DP 30% via WhatsApp.',
      'price_idr',   4500000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1631621583126-ed10a80f62b1',
      'name',        'Prewedding Session',
      'description', 'Sesi 4 jam di 2 lokasi (Tebing Breksi, Heha, atau studio). 60 foto edit, soft-file 5 hari. Outdoor Jogja included.',
      'price_idr',   1800000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
      'name',        'Product Photography',
      'description', 'Flat-lay atau styled in-context, background putih atau natural. 20 foto edit retouch, soft-file 3 hari kerja.',
      'price_idr',   1200000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1627161683077-e34782c24d81',
      'name',        'Headshot Portrait',
      'description', 'Foto profil korporat atau editorial, 1 jam di studio Jogja. 10 foto retouch profesional, turnaround 2 hari.',
      'price_idr',   800000
    )
  ),
  updated_at = now()
where slug = 'demo-photo-arka';
