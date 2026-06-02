/**
 * Tour package templates — pre-populated itineraries for Yogyakarta drivers.
 *
 * Suggested prices are 10–20% below the current Yogyakarta retail-market
 * average (sourced May 2026 from public listings: Naga Tour, Sabila
 * Transport, Kejawa Tour, Hiredriveryogyakarta, NusantaraTrip). Drivers
 * clone a template in their dashboard, override price/photo/notes, then
 * publish. CityDrivers never sets the final price — these are starting
 * points only (PM 12/2019 directory posture).
 *
 * `place_slugs` references rows in the `places` table where they exist;
 * unknown slugs are surfaced as free-text destination names in the
 * customer-facing tour card.
 */

export type TourVehicleKind = 'car' | 'bike' | 'jeep'

export type TourTemplate = {
  id:              string
  vehicle:         TourVehicleKind
  title:           string
  description:     string
  duration_hours:  number
  max_pax:         number
  /** Suggested price in IDR — driver can override. Sourced from public
   *  competitor listings and discounted ~10–20% to undercut on launch. */
  suggested_price: number
  /** Market-floor benchmark — what other operators charge. Surfaces in
   *  the dashboard as "Market avg Rp X" so the driver sees the reference. */
  market_floor:    number
  includes:        readonly string[]
  excludes:        readonly string[]
  /** Slugs that should already exist in public.places when seeded.
   *  Unknown slugs are rendered as free-text place names. */
  place_slugs:     readonly string[]
  /** Cheap relevance-search tags — driver dashboard filters by these. */
  tags:            readonly string[]
}

/** Universal safe fallback image for any tour that has no driver upload
 *  and no resolvable place image. Points at a known-good ImageKit asset
 *  inside the founder's CDN bucket — guaranteed to load.
 *
 *  TODO (Supabase backfill): upload location-specific tour cover images
 *  to Supabase Storage (or upload to ImageKit at /nepgaxllc/tours/<slug>.jpg)
 *  and either (a) populate `public.places.image_url` for every place_slug
 *  referenced below — the existing tour-card cascade will then surface
 *  the place image automatically — or (b) extend TourTemplate with an
 *  explicit `image_url` field per tour. */
const DEFAULT_TOUR_IMAGE =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2030,%202026,%2001_51_17%20AM.png'

/** Returns a guaranteed-to-load image URL for a tour template. The card
 *  cascade in ToursTabContent still prefers driver upload → place image
 *  first, so this is only used when neither is set. */

// Per-template hero image overrides. Founder-supplied artwork keyed by
// template `id`. Templates without a key fall through to
// DEFAULT_TOUR_IMAGE. Adding a new tour is just one line — keys must
// match the `id` field on the template exactly (typo = silent fallback).
const TEMPLATE_IMAGES: Record<string, string> = {
  'bike-kraton-tamansari': 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%202,%202026,%2005_37_11%20PM.png',
  'bike-umkm-workshop':    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%202,%202026,%2005_43_22%20PM.png',
  'bike-sunset-city':      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%202,%202026,%2005_48_48%20PM.png',
  'bike-parangtritis':     'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%202,%202026,%2005_50_13%20PM.png',
  'bike-village-coffee':   'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%202,%202026,%2005_57_26%20PM.png',
  'bike-kotagede-kasongan':'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%202,%202026,%2006_02_41%20PM.png',
}

export function templateImageUrl(template: TourTemplate): string {
  return TEMPLATE_IMAGES[template.id] ?? DEFAULT_TOUR_IMAGE
}

/** Lookup by template id — returns the founder-supplied artwork or
 *  null when no override exists. Used by ToursTabContent's thumbnail
 *  cascade so REAL driver tours (driver_tour_packages rows with
 *  template_id but no photo_url) automatically inherit the template's
 *  hero image, instead of falling through to a place_slug image or a
 *  blank card. Distinct from templateImageUrl() — that one always
 *  returns a non-null URL (default placeholder fallback) and is for
 *  the dashboard preview where "show me what this template looks like"
 *  must always render something. */
export function getTemplateImageUrl(templateId: string | null | undefined): string | null {
  if (!templateId) return null
  return TEMPLATE_IMAGES[templateId] ?? null
}

export const TOUR_TEMPLATES: ReadonlyArray<TourTemplate> = [
  // ── Car tours · Temple loops ─────────────────────────────────────────────
  {
    id: 'car-borobudur-sunrise',
    vehicle: 'car',
    title: 'Borobudur Sunrise Tour',
    description: 'Pre-dawn departure for sunrise at Borobudur (Setumbu Hill viewpoint or temple grounds), then return via Magelang back to Yogya. Iconic Yogya day-trip.',
    duration_hours: 12, max_pax: 6,
    suggested_price: 650_000, market_floor: 750_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees (Setumbu Rp 60k, Borobudur Rp 450k foreigner)', 'breakfast'],
    place_slugs: ['borobudur', 'mendut-temple', 'pawon-temple'],
    tags: ['sunrise', 'temple', 'unesco', 'iconic'],
  },
  {
    id: 'car-borobudur-prambanan',
    vehicle: 'car',
    title: 'Borobudur + Prambanan Combo',
    description: 'Two UNESCO sites in one day — Borobudur morning, Prambanan afternoon. The classic Yogya temple double-header.',
    duration_hours: 10, max_pax: 6,
    suggested_price: 600_000, market_floor: 700_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['borobudur', 'prambanan'],
    tags: ['temple', 'unesco', 'classic'],
  },
  {
    id: 'car-borobudur-mendut-pawon',
    vehicle: 'car',
    title: 'Borobudur Temple Triangle',
    description: 'Borobudur + Mendut + Pawon — the three temples along the original Buddhist pilgrimage line. Slower, deeper itinerary.',
    duration_hours: 8, max_pax: 6,
    suggested_price: 500_000, market_floor: 600_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['borobudur', 'mendut-temple', 'pawon-temple'],
    tags: ['temple', 'unesco', 'pilgrimage'],
  },
  {
    id: 'car-prambanan-ratuboko-sunset',
    vehicle: 'car',
    title: 'Prambanan + Ratu Boko Sunset',
    description: 'Prambanan in afternoon light, then Ratu Boko palace for sunset over the Yogya valley. The combo ticket saves the customer money.',
    duration_hours: 6, max_pax: 6,
    suggested_price: 400_000, market_floor: 500_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['prambanan', 'ratu-boko'],
    tags: ['temple', 'sunset', 'unesco'],
  },
  {
    id: 'car-prambanan-ijo-sambisari',
    vehicle: 'car',
    title: 'Prambanan + Hidden Temples',
    description: 'Prambanan plus the less-visited Ijo Temple (highest in Yogya, sunset hilltop) and Sambisari (sunken Hindu temple). Off-tourist-path.',
    duration_hours: 8, max_pax: 6,
    suggested_price: 550_000, market_floor: 650_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['prambanan', 'ijo-temple', 'sambisari-temple'],
    tags: ['temple', 'hidden-gems', 'sunset'],
  },
  {
    id: 'car-plaosan-banyunibo',
    vehicle: 'car',
    title: 'Plaosan + Banyunibo + Sojiwan',
    description: 'Twin Buddhist-Hindu temples east of Prambanan — Plaosan (twin temples), Banyunibo (golden hour), Sojiwan (intricate reliefs). Photographer favourite.',
    duration_hours: 6, max_pax: 6,
    suggested_price: 450_000, market_floor: 550_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['plaosan-temple', 'banyunibo-temple', 'sojiwan-temple'],
    tags: ['temple', 'photography', 'off-the-beaten-path'],
  },

  // ── Car tours · Volcanic & Highland ──────────────────────────────────────
  {
    id: 'car-merapi-jeep',
    vehicle: 'car',
    title: 'Merapi Lava Jeep + Kaliurang',
    description: 'Car transport to the Jeep base camp at Kaliurang, then 2h Jeep tour over the lava fields, bunker, and viewpoints. Volcano experience.',
    duration_hours: 6, max_pax: 4,
    suggested_price: 450_000, market_floor: 550_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['Jeep rental (Rp 350-550k per Jeep)', 'meals', 'entrance fees'],
    place_slugs: ['mount-merapi', 'kaliurang'],
    tags: ['volcano', 'adventure', 'merapi'],
  },
  {
    id: 'car-merapi-full',
    vehicle: 'car',
    title: 'Merapi Full Day Experience',
    description: 'Merapi Lava Jeep + Kaliadem Bunker + Stone of Alien + sunset at Kaliurang. Most thorough Merapi day-trip.',
    duration_hours: 8, max_pax: 4,
    suggested_price: 600_000, market_floor: 750_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['Jeep rental', 'meals', 'entrance fees'],
    place_slugs: ['mount-merapi', 'kaliurang'],
    tags: ['volcano', 'adventure', 'full-day'],
  },
  {
    id: 'car-dieng-full',
    vehicle: 'car',
    title: 'Dieng Plateau Full Day',
    description: 'Pre-dawn pickup → Sikunir sunrise (Negeri di Atas Awan / Country Above the Clouds) → Telaga Warna → Arjuna temples → Kawah Sikidang. Long but iconic.',
    duration_hours: 14, max_pax: 6,
    suggested_price: 1_100_000, market_floor: 1_400_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees (~Rp 100k pp)', 'meals'],
    place_slugs: ['dieng-plateau'],
    tags: ['mountain', 'sunrise', 'highland', 'full-day'],
  },
  {
    id: 'car-kalibiru',
    vehicle: 'car',
    title: 'Kalibiru Treetop + Wates Highlands',
    description: 'Kalibiru National Park treetop selfie viewpoints + Waduk Sermo lake. Instagram favourite.',
    duration_hours: 8, max_pax: 6,
    suggested_price: 550_000, market_floor: 650_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['kalibiru'],
    tags: ['nature', 'photography', 'highland'],
  },
  {
    id: 'car-mangunan-becici',
    vehicle: 'car',
    title: 'Mangunan Pine Forest + Becici Sunset',
    description: 'Mangunan Pine Forest mid-afternoon + Bukit Panguk Kediwung sunset view over the Oya River valley. Cool highland air.',
    duration_hours: 6, max_pax: 6,
    suggested_price: 400_000, market_floor: 500_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['mangunan-pine-forest', 'bukit-panguk'],
    tags: ['nature', 'sunset', 'forest'],
  },

  // ── Car tours · Beaches (Gunung Kidul south coast) ───────────────────────
  {
    id: 'car-south-coast-hop',
    vehicle: 'car',
    title: 'South Coast Beach Hop',
    description: 'Indrayanti, Pok Tunggal, Krakal, Sundak — four white-sand beaches in a single loop. Bring swimwear.',
    duration_hours: 10, max_pax: 6,
    suggested_price: 750_000, market_floor: 900_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['entrance fees (~Rp 10k/beach)', 'meals'],
    place_slugs: ['indrayanti-beach', 'pok-tunggal-beach', 'krakal-beach', 'sundak-beach'],
    tags: ['beach', 'south-coast', 'multi-stop'],
  },
  {
    id: 'car-timang-gondola',
    vehicle: 'car',
    title: 'Timang Beach Gondola Adventure',
    description: 'Timang Beach — the famous lobster-fisherman gondola crossing to Timang Island. Adrenaline + ocean.',
    duration_hours: 10, max_pax: 6,
    suggested_price: 800_000, market_floor: 950_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'parking'],
    excludes: ['gondola ride (Rp 200k pp)', 'entrance fees', 'meals'],
    place_slugs: ['timang-beach'],
    tags: ['beach', 'adventure', 'gondola'],
  },
  {
    id: 'car-parangtritis-selarong',
    vehicle: 'car',
    title: 'Parangtritis + Goa Selarong',
    description: 'Yogya\'s famous southern beach + Goa Selarong cave (Prince Diponegoro hideout). Half-day classic.',
    duration_hours: 6, max_pax: 6,
    suggested_price: 400_000, market_floor: 500_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['parangtritis-beach', 'goa-selarong'],
    tags: ['beach', 'cave', 'half-day'],
  },
  {
    id: 'car-nglambor-siung',
    vehicle: 'car',
    title: 'Nglambor Snorkel + Siung Beach',
    description: 'Nglambor — the rare snorkel-friendly beach behind a coral barrier — plus Siung (climbing cliffs). For active travellers.',
    duration_hours: 10, max_pax: 4,
    suggested_price: 800_000, market_floor: 950_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['snorkel gear rental', 'entrance fees', 'meals'],
    place_slugs: ['nglambor-beach', 'siung-beach'],
    tags: ['beach', 'snorkel', 'active'],
  },

  // ── Car tours · Caves & Waterfalls ───────────────────────────────────────
  {
    id: 'car-pindul-sri-gethuk',
    vehicle: 'car',
    title: 'Pindul Cave Tubing + Sri Gethuk Waterfall',
    description: 'Cave-tubing on a river inside Pindul Cave + Sri Gethuk Waterfall raft tour. Best for adventurous families.',
    duration_hours: 10, max_pax: 6,
    suggested_price: 700_000, market_floor: 850_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['cave tubing fee', 'raft fee', 'meals'],
    place_slugs: ['pindul-cave', 'sri-gethuk-waterfall'],
    tags: ['cave', 'waterfall', 'adventure', 'family'],
  },
  {
    id: 'car-jomblang-cave',
    vehicle: 'car',
    title: 'Jomblang Cave — Heaven\'s Light',
    description: 'Vertical caving descent to the Jomblang sinkhole where a "heaven\'s light" beam shines through midday. Requires booking permit in advance.',
    duration_hours: 12, max_pax: 4,
    suggested_price: 950_000, market_floor: 1_200_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['Jomblang ticket (Rp 750k pp — book ahead)', 'meals'],
    place_slugs: ['jomblang-cave'],
    tags: ['cave', 'adventure', 'photography', 'iconic'],
  },

  // ── Car tours · City & Culture ───────────────────────────────────────────
  {
    id: 'car-city-classic',
    vehicle: 'car',
    title: 'Yogya City Classic Tour',
    description: 'Kraton (Sultan\'s Palace) + Taman Sari Water Castle + Malioboro Street + Alun-Alun Selatan (Twin Banyan trees). The standard half-day intro.',
    duration_hours: 5, max_pax: 6,
    suggested_price: 300_000, market_floor: 400_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['kraton-yogyakarta', 'taman-sari', 'malioboro', 'alun-alun-selatan'],
    tags: ['city', 'culture', 'classic', 'half-day'],
  },
  {
    id: 'car-craft-villages',
    vehicle: 'car',
    title: 'Craft Village Loop',
    description: 'Kotagede (silver) + Kasongan (pottery) + Manding (leather) + Bantul (batik). See artisans at work, buy direct from makers.',
    duration_hours: 6, max_pax: 6,
    suggested_price: 400_000, market_floor: 500_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['meals', 'purchases'],
    place_slugs: ['kotagede', 'kasongan', 'manding', 'bantul'],
    tags: ['culture', 'craft', 'shopping', 'umkm'],
  },
  {
    id: 'car-imogiri-royal',
    vehicle: 'car',
    title: 'Imogiri Royal Cemetery + Hidden Lanes',
    description: 'Imogiri (Sultan tombs) + Pasar Beringharjo back lanes + small batik workshop. Off-tourist-path day.',
    duration_hours: 6, max_pax: 6,
    suggested_price: 400_000, market_floor: 500_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['imogiri', 'pasar-beringharjo'],
    tags: ['culture', 'royal', 'off-the-beaten-path'],
  },

  // ── Car tours · Outside Yogya ────────────────────────────────────────────
  {
    id: 'car-magelang-selo',
    vehicle: 'car',
    title: 'Magelang + Selo Pass',
    description: 'Magelang town + Punthuk Setumbu sunrise viewpoint + Selo mountain pass between Merapi and Merbabu. Stunning landscape day.',
    duration_hours: 10, max_pax: 6,
    suggested_price: 800_000, market_floor: 950_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['magelang'],
    tags: ['mountain', 'landscape', 'sunrise'],
  },
  {
    id: 'car-solo-daytrip',
    vehicle: 'car',
    title: 'Solo (Surakarta) Day Trip',
    description: 'Solo Kraton + Pasar Klewer (textile market) + Mangkunegaran Palace + Sangiran archaeological museum. Solo is 1.5h drive east of Yogya.',
    duration_hours: 12, max_pax: 6,
    suggested_price: 1_000_000, market_floor: 1_200_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['solo-kraton', 'pasar-klewer'],
    tags: ['city', 'culture', 'royal', 'shopping'],
  },

  // ── Car tours · Airport + Charter ────────────────────────────────────────
  {
    id: 'car-airport-yia',
    vehicle: 'car',
    title: 'YIA Airport Transfer',
    description: 'Door-to-door transfer between Yogya city and Yogyakarta International Airport (YIA, Kulon Progo). ~45km, 1.5h.',
    duration_hours: 2, max_pax: 6,
    suggested_price: 300_000, market_floor: 400_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water', 'meet-and-greet sign'],
    excludes: ['parking', 'tolls'],
    place_slugs: ['yia-airport'],
    tags: ['airport', 'transfer'],
  },
  {
    id: 'car-airport-jog',
    vehicle: 'car',
    title: 'Adisutjipto Airport Transfer',
    description: 'Door-to-door transfer between Yogya city and Adisutjipto Airport (JOG, the old domestic-only airport).',
    duration_hours: 1.5, max_pax: 6,
    suggested_price: 175_000, market_floor: 225_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['parking', 'tolls'],
    place_slugs: ['adisutjipto-airport'],
    tags: ['airport', 'transfer'],
  },
  {
    id: 'car-event-charter',
    vehicle: 'car',
    title: 'Wedding / Event Half-Day Charter',
    description: 'Half-day driver + car for weddings, formal events, or family gatherings. Driver waits between stops; flexible itinerary.',
    duration_hours: 5, max_pax: 6,
    suggested_price: 500_000, market_floor: 650_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['decorations', 'meals'],
    place_slugs: [],
    tags: ['charter', 'event', 'wedding'],
  },
  {
    id: 'car-photo-follow',
    vehicle: 'car',
    title: 'Pre-Wedding / Photographer Follow',
    description: 'Full-day driver for photographer + couple — multi-location shoot day, driver stays nearby and helps with gear / props.',
    duration_hours: 8, max_pax: 6,
    suggested_price: 600_000, market_floor: 800_000,
    includes: ['driver', 'fuel', 'AC car', 'mineral water'],
    excludes: ['location fees', 'meals'],
    place_slugs: [],
    tags: ['charter', 'photography', 'wedding'],
  },

  // ── Bike tours ───────────────────────────────────────────────────────────
  {
    id: 'bike-sunset-city',
    vehicle: 'bike',
    title: 'Sunset City Round',
    description: 'Tugu Yogya → Malioboro → Kraton → Alun-Alun Selatan as the sun goes down. Best on the back of a guide bike, photographer-friendly.',
    duration_hours: 3, max_pax: 1,
    suggested_price: 150_000, market_floor: 200_000,
    includes: ['rider', 'fuel', 'helmet', 'optional pillion'],
    excludes: ['food', 'entrance fees'],
    place_slugs: ['tugu-yogyakarta', 'malioboro', 'kraton-yogyakarta', 'alun-alun-selatan'],
    tags: ['city', 'sunset', 'photo'],
  },
  {
    id: 'bike-kraton-tamansari',
    vehicle: 'bike',
    title: 'Kraton + Taman Sari Photo Loop',
    description: 'Short ride through Kraton walls + Taman Sari Water Castle + the hidden alleyway tunnels. Photographer-led pacing.',
    duration_hours: 2, max_pax: 1,
    suggested_price: 100_000, market_floor: 150_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['entrance fees', 'food'],
    place_slugs: ['kraton-yogyakarta', 'taman-sari'],
    tags: ['city', 'culture', 'photo', 'short'],
  },
  {
    id: 'bike-parangtritis',
    vehicle: 'bike',
    title: 'Parangtritis Beach Ride',
    description: 'Coast-bound ride to Parangtritis Beach (or Depok if quieter). The ride itself is part of the experience.',
    duration_hours: 6, max_pax: 1,
    suggested_price: 350_000, market_floor: 450_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['beach entrance', 'food'],
    place_slugs: ['parangtritis-beach'],
    tags: ['beach', 'ride'],
  },
  {
    id: 'bike-village-coffee',
    vehicle: 'bike',
    title: 'Village + Coffee Ride',
    description: 'Bantul or Imogiri villages — small lanes, batik makers, local coffee warung stops. Slow pace.',
    duration_hours: 4, max_pax: 1,
    suggested_price: 200_000, market_floor: 280_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['coffee', 'snacks'],
    place_slugs: ['imogiri'],
    tags: ['village', 'coffee', 'slow'],
  },
  {
    id: 'bike-kotagede-kasongan',
    vehicle: 'bike',
    title: 'Kotagede Silver + Kasongan Pottery',
    description: 'Visit silver workshops in Kotagede + pottery makers in Kasongan. Smaller, more personal than the car version.',
    duration_hours: 4, max_pax: 1,
    suggested_price: 250_000, market_floor: 320_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['purchases', 'meals'],
    place_slugs: ['kotagede', 'kasongan'],
    tags: ['craft', 'umkm', 'shopping'],
  },
  {
    id: 'bike-mangunan-sunrise',
    vehicle: 'bike',
    title: 'Mangunan Pine + Bukit Panguk Sunrise',
    description: 'Pre-dawn pickup → up to Bukit Panguk for sunrise above the cloud-filled Oya River valley → Mangunan Pine Forest after.',
    duration_hours: 5, max_pax: 1,
    suggested_price: 300_000, market_floor: 400_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['entrance fees', 'breakfast'],
    place_slugs: ['mangunan-pine-forest', 'bukit-panguk'],
    tags: ['sunrise', 'nature', 'photo'],
  },
  {
    id: 'bike-imogiri-hidden',
    vehicle: 'bike',
    title: 'Imogiri Cemetery + Hidden Lanes',
    description: 'Imogiri Royal Cemetery + small back-lane batik workshops. Cultural slow ride.',
    duration_hours: 4, max_pax: 1,
    suggested_price: 200_000, market_floor: 275_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['imogiri'],
    tags: ['culture', 'slow', 'off-the-beaten-path'],
  },
  {
    id: 'bike-streetfood-night',
    vehicle: 'bike',
    title: 'Yogya Night Street-Food Tour',
    description: 'Evening ride between Malioboro lesehan + Alun-Alun warung + bakmi Jawa joints. Eat where the locals eat.',
    duration_hours: 3, max_pax: 1,
    suggested_price: 175_000, market_floor: 250_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['food costs (~Rp 50-100k pp)'],
    place_slugs: ['malioboro', 'alun-alun-selatan'],
    tags: ['food', 'night', 'culture'],
  },
  {
    id: 'bike-market-warung',
    vehicle: 'bike',
    title: 'Morning Market + Warung Breakfast',
    description: 'Pasar Beringharjo or Pasar Pathuk early morning + breakfast at a beloved local warung. See Yogya wake up.',
    duration_hours: 3, max_pax: 1,
    suggested_price: 150_000, market_floor: 200_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['breakfast cost'],
    place_slugs: ['pasar-beringharjo'],
    tags: ['food', 'culture', 'morning'],
  },
  {
    id: 'bike-umkm-workshop',
    vehicle: 'bike',
    title: 'UMKM Workshop Visit',
    description: 'Visit a working batik or silver workshop with the artisan demonstrating. Driver helps translate and explain.',
    duration_hours: 4, max_pax: 1,
    suggested_price: 250_000, market_floor: 350_000,
    includes: ['rider', 'fuel', 'helmet'],
    excludes: ['materials', 'optional workshop fee'],
    place_slugs: ['kotagede', 'bantul'],
    tags: ['craft', 'umkm', 'cultural'],
  },

  // ── Jeep tours · Adventure charter ──────────────────────────────────────
  {
    id: 'jeep-merapi-lava',
    vehicle: 'jeep',
    title: 'Merapi Lava Tour',
    description: 'Open-jeep adventure to the southern Merapi slope — Kaliadem Bunker, Batu Alien volcanic boulder, and the Mini Museum of the 2010 eruption.',
    duration_hours: 3, max_pax: 4,
    suggested_price: 450_000, market_floor: 550_000,
    includes: ['jeep', 'driver', 'fuel', 'mineral water'],
    excludes: ['entrance fees', 'meals'],
    place_slugs: ['bunker-kaliadem', 'batu-alien', 'merapi-lava-tour'],
    tags: ['adventure', 'volcano', 'off_road'],
  },
  {
    id: 'jeep-bromo-sunrise',
    vehicle: 'jeep',
    title: 'Bromo Sunrise Charter',
    description: 'Pre-dawn departure from Yogya for sunrise at Mount Bromo viewpoint, then crater rim + sea of sand. Returns by evening. Full-day premium charter.',
    duration_hours: 18, max_pax: 4,
    suggested_price: 1_800_000, market_floor: 2_200_000,
    includes: ['jeep', 'driver', 'fuel', 'mineral water'],
    excludes: ['entrance fees (Bromo ~ Rp 220k foreigner)', 'meals', 'horse hire at sea of sand'],
    place_slugs: ['gunung-merapi'],
    tags: ['sunrise', 'volcano', 'adventure', 'premium'],
  },
  {
    id: 'jeep-cave-tubing-pindul',
    vehicle: 'jeep',
    title: 'Goa Pindul Cave Tubing + Sri Gethuk',
    description: 'Jeep to Gunungkidul karst country — cave tubing through Goa Pindul, then waterfall lunch at Sri Gethuk. Half-day, family-friendly.',
    duration_hours: 6, max_pax: 4,
    suggested_price: 750_000, market_floor: 900_000,
    includes: ['jeep', 'driver', 'fuel'],
    excludes: ['tubing fee (~ Rp 45k pp)', 'boat fee', 'meals'],
    place_slugs: ['goa-pindul', 'air-terjun-sri-gethuk'],
    tags: ['cave', 'waterfall', 'adventure', 'family'],
  },
  {
    id: 'jeep-south-coast-adventure',
    vehicle: 'jeep',
    title: 'South Coast Adventure',
    description: 'Off-road jeep run along the Gunungkidul south coast — Timang gondola, Pok Tunggal, Indrayanti for sunset. Bring swimwear.',
    duration_hours: 8, max_pax: 4,
    suggested_price: 950_000, market_floor: 1_200_000,
    includes: ['jeep', 'driver', 'fuel', 'mineral water'],
    excludes: ['entrance fees (each beach ~ Rp 10k)', 'gondola ride at Timang', 'meals'],
    place_slugs: ['timang-beach', 'pok-tunggal-beach', 'indrayanti-beach'],
    tags: ['beach', 'sunset', 'adventure'],
  },
] as const

export function tourTemplatesForVehicle(vehicle: TourVehicleKind): readonly TourTemplate[] {
  return TOUR_TEMPLATES.filter((t) => t.vehicle === vehicle)
}

export function tourTemplateById(id: string): TourTemplate | null {
  return TOUR_TEMPLATES.find((t) => t.id === id) ?? null
}

// ── Mock-driver tour + language seed ────────────────────────────────────────
// mock_drivers don't have rows in driver_tour_packages (the table's
// foreign key is to drivers.user_id). To make the Tours tab + language
// flag-row visible on demo profiles, the public profile loader pulls
// from these in-memory maps when the driver is a mock. Real drivers
// always read from Supabase; mocks render synthetic tours from these
// template ids.
//
// Updating this is the only ceremony needed to give a mock more tours
// or a different language mix.

export const MOCK_TOUR_ASSIGNMENTS: Record<string, string[]> = {
  // Car mocks
  'dwi-toyota-innova-jogja':   ['car-borobudur-sunrise', 'car-dieng-full', 'car-airport-yia'],
  'budi-toyota-avanza-yogya':  ['car-borobudur-prambanan', 'car-city-classic', 'car-south-coast-hop', 'car-airport-yia'],
  'siti-honda-mobilio-sleman': ['car-south-coast-hop', 'car-merapi-jeep', 'car-craft-villages'],
  // Bike mocks
  'demo-andi-cb':              ['bike-sunset-city', 'bike-parangtritis'],
  'demo-budi-beat':            ['bike-village-coffee', 'bike-streetfood-night', 'bike-market-warung'],
  'demo-citra-scoopy':         ['bike-kraton-tamansari', 'bike-umkm-workshop', 'bike-mangunan-sunrise'],
  // Jeep mocks — each gets a different tour mix so the profiles read
  // visibly distinct on the demo /jeep marketplace + profiles.
  'demo-jeep-yusuf-bromo-yogya':       ['jeep-bromo-sunrise', 'jeep-merapi-lava', 'jeep-cave-tubing-pindul'],
  'demo-jeep-wahyu-merapi-yogya':      ['jeep-merapi-lava', 'jeep-cave-tubing-pindul', 'jeep-south-coast-adventure'],
  'demo-jeep-bambang-adventure-yogya': ['jeep-south-coast-adventure', 'jeep-cave-tubing-pindul', 'jeep-merapi-lava'],
}

export const MOCK_LANGUAGES: Record<string, string[]> = {
  // Car mocks
  'dwi-toyota-innova-jogja':   ['id', 'en', 'zh'],
  'budi-toyota-avanza-yogya':  ['id', 'en'],
  'siti-honda-mobilio-sleman': ['id', 'en'],
  // Bike mocks
  'demo-andi-cb':              ['id', 'en'],
  'demo-budi-beat':            ['id'],
  'demo-citra-scoopy':         ['id', 'en', 'jv'],
  // Jeep mocks
  'demo-jeep-yusuf-bromo-yogya':       ['id', 'en'],
  'demo-jeep-wahyu-merapi-yogya':      ['id', 'en'],
  'demo-jeep-bambang-adventure-yogya': ['id', 'en'],
  // Bus / minibus mocks
  'rahmat-hiace-jogja-charter':        ['id', 'en'],
  // Truck mocks
  'l300-pickup-pindahan-yogya':        ['id', 'en'],
}

/**
 * Synthetic TourPackage rows for a mock driver. Returned as if they came
 * from Supabase (same shape) so the profile shell renders them through
 * the same UI path as real drivers' tours.
 */
export function mockToursForSlug(slug: string): Array<{
  id:              string
  driver_id:       string
  template_id:     string | null
  title:           string
  description:     string | null
  duration_hours:  number
  max_pax:         number | null
  price_idr:       number
  includes:        string[]
  excludes:        string[]
  place_slugs:     string[]
  photo_url:       string | null
  published:       boolean
  created_at:      string
  updated_at:      string
}> {
  const ids = MOCK_TOUR_ASSIGNMENTS[slug] ?? []
  const now = new Date().toISOString()
  const tours = []
  for (const id of ids) {
    const t = tourTemplateById(id)
    if (!t) continue
    // Deterministic 4.5–5.0 rating from template+driver-slug hash so each
    // mock card shows a stable but varied star score.
    const seed = [...`${slug}:${id}`].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const rating = Math.round((4.5 + (seed % 51) / 100) * 10) / 10
    const reviewCount = 18 + (seed % 84)
    tours.push({
      id:             `mock-${slug}-${id}`,
      driver_id:      `mock-${slug}`,
      template_id:    id,
      title:          t.title,
      description:    t.description,
      duration_hours: t.duration_hours,
      max_pax:        t.max_pax,
      price_idr:      t.suggested_price,
      includes:       [...t.includes],
      excludes:       [...t.excludes],
      place_slugs:    [...t.place_slugs],
      photo_url:      templateImageUrl(t),
      published:      true,
      created_at:     now,
      updated_at:     now,
      rating,
      rating_count:   reviewCount,
    })
  }
  return tours
}
