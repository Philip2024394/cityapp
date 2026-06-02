// ============================================================================
// serviceOfferings — canonical catalog of trip types a driver can offer.
// ----------------------------------------------------------------------------
// One row per offering. Stored as a `text[]` of these `id` values on
// `drivers.service_offerings` / `mock_drivers.service_offerings` (migration
// 0110). Surfaced on the customer-facing profile (DriverProfileShell) as a
// row of yellow-tint badges under the bio, and edited by drivers from the
// car + bike dashboards as toggle pills.
//
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019 — these labels describe
// the kinds of trips a driver SAYS they offer, not promises by the platform.
// ============================================================================

export type ServiceOfferingId =
  | 'city_service'
  | 'daily_hire'
  | 'hourly_hire'
  | 'airport_pickup'
  | 'tour_destinations'
  | 'private_charter'
  | 'wedding_event'
  | 'cargo_parcel'

export const SERVICE_OFFERINGS: ReadonlyArray<{ id: ServiceOfferingId; label: string }> = [
  { id: 'city_service',      label: 'City Service' },
  { id: 'daily_hire',        label: 'Daily Hire' },
  { id: 'hourly_hire',       label: 'Hourly Hire' },
  { id: 'airport_pickup',    label: 'Airport Pickup' },
  { id: 'tour_destinations', label: 'Tour Destinations' },
  { id: 'private_charter',   label: 'Private Charter' },
  { id: 'wedding_event',     label: 'Wedding / Event' },
  { id: 'cargo_parcel',      label: 'Cargo / Parcel' },
]

// ============================================================================
// Per-vehicle service catalogs — truck + minibus.
// ----------------------------------------------------------------------------
// These describe the *kinds of jobs* a small-truck or minibus driver does in
// Yogyakarta. Each entry carries:
//   - id / labels    — stable id + short EN+ID chip text
//   - description    — one-line summary (≤90 chars) for portfolio carousel +
//                       dashboard editor card
//   - rate_model     — semantic hint about how rates scale (per trip, per day,
//                       package, etc.) — drives copy on the public profile
//   - header/subtext — copy shown above the rate chart on the public profile
//   - default_rates  — Yogya-market default rate rows (driver-overridable)
//   - includes/excludes — chip lists showing what's bundled in / out
//   - imageUrl       — (truck only) carousel image — kept ALIVE so the
//                       existing PortfolioCarousel keeps rendering.
//
// Driver-supplied overrides are stored in `drivers.service_rates` (jsonb,
// migration 0169) shaped `{ [service_id]: { rates: RateRow[] } }`. When the
// override is missing or empty, the public profile falls back to the catalog
// `default_rates` defined here.
// ============================================================================

export type RateRow = {
  /** Free-text rate label, e.g. "In-city", "Magelang", "6h", "Per rit". */
  label: string
  /** IDR amount as a plain integer (no thousands separators, no Rp prefix). */
  idr:   number
  /** Optional unit suffix, e.g. "/day", "/unit". Rendered after the amount. */
  per?:  string
}

export type ServiceCatalogEntry = {
  /** Snake-case stable id used as the jsonb key in drivers.service_rates. */
  id: string
  /** Short English chip label (≤ 12 chars). */
  label_en: string
  /** Short Indonesian chip label (≤ 14 chars). */
  label_id: string
  /** One-line summary used on the dashboard editor + portfolio carousel. */
  description: string
  /** Semantic rate model — hints to the UI how to render the chart. */
  rate_model: 'daily' | 'per_trip' | 'per_destination_package' | 'multi_day' | 'per_person' | 'per_unit'
  /** Header shown above the rate chart on the public profile rate panel. */
  header: string
  /** Small subtext explainer below the header. ≤ 2 sentences. */
  subtext: string
  /** Yogya-market default rate rows — driver can override per-service. */
  default_rates: readonly RateRow[]
  /** Small grey/green pills below the rate chart — what's bundled in. */
  includes: readonly string[]
  /** Small grey/amber pills below the rate chart — what's NOT bundled. */
  excludes: readonly string[]
  /** Optional curated carousel image (truck verticals). */
  imageUrl?: string
}

// -----------------------------------------------------------------------------
// Shared carousel image — legacy `imageUrl` field is consumed by the truck
// portfolio carousel (VehicleProfileShell → buildPortfolioPhotos). Keep the
// pointer alive so swapping the catalog doesn't blank out the carousel.
// -----------------------------------------------------------------------------
const CAROUSEL_IMG =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png'

// =============================================================================
// TRUCK_SERVICE_OFFERINGS — Yogyakarta small-truck (L300 / Pickup) catalog.
// =============================================================================
export const TRUCK_SERVICE_OFFERINGS: readonly ServiceCatalogEntry[] = [
  {
    id:          'house_move',
    label_en:    'House Move',
    label_id:    'Pindahan',
    description: 'Pindahan rumah / kos / apartemen — driver + 1 kenek termasuk.',
    rate_model:  'per_trip',
    header:      'Pindahan rumah / kos',
    subtext:     'Sewa pickup-truk termasuk sopir dan 1 kenek. BBM luar-kota ditanggung pelanggan; biaya tol & parkir terpisah.',
    default_rates: [
      { label: 'Dalam kota Yogya', idr: 325000 },
      { label: 'Sleman / Bantul',   idr: 525000 },
    ],
    includes: ['driver', 'fuel', '1 kenek'],
    excludes: ['extra helpers', 'packing', 'tolls'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'construction_mat',
    label_en:    'Construction',
    label_id:    'Material',
    description: 'Semen, besi, kayu, dan material bangunan ke lokasi proyek.',
    rate_model:  'per_trip',
    header:      'Angkut material bangunan',
    subtext:     'Sewa truk termasuk sopir dan BBM. Kenek, parkir, dan jasa bongkar di lokasi tidak termasuk.',
    default_rates: [
      { label: 'Dalam kota',  idr: 250000 },
      { label: 'Border Yogya', idr: 500000 },
    ],
    includes: ['driver', 'fuel'],
    excludes: ['kenek', 'parking', 'tolls', 'unloading'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'sand_gravel',
    label_en:    'Sand/Gravel',
    label_id:    'Pasir/Krikil',
    description: 'Pasir dan krikil dari quarry / kali — per rit ~1m³.',
    rate_model:  'per_trip',
    header:      'Pasir & krikil per rit',
    subtext:     'Tarif per rit (~1m³) sudah termasuk material dari sumber dan BBM. Tenaga sekop di lokasi tidak termasuk.',
    default_rates: [
      { label: 'Per rit (~1m³)', idr: 350000 },
    ],
    includes: ['driver', 'fuel', 'material at source'],
    excludes: ['shovel labour at site'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'bricks_block',
    label_en:    'Bricks',
    label_id:    'Bata/Batako',
    description: 'Bata merah, batako, dan paving block langsung ke lokasi bangun.',
    rate_model:  'per_trip',
    header:      'Bata / batako per muatan',
    subtext:     'Tarif per muatan (~500 batako). Bongkar di lokasi opsional — sepakati langsung dengan sopir.',
    default_rates: [
      { label: 'Per muatan (~500 batako)', idr: 325000 },
    ],
    includes: ['driver', 'fuel', 'loading at depot'],
    excludes: ['stacking at site'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'debris_haul',
    label_en:    'Debris Haul',
    label_id:    'Buang Puing',
    description: 'Buang puing, sisa renovasi, atau material bongkaran ke TPA.',
    rate_model:  'per_trip',
    header:      'Buang puing / sampah bongkar',
    subtext:     'Tarif per pengangkutan sudah termasuk biaya buang di TPA. Tenaga bongkar dan lansir di luar standar tidak termasuk.',
    default_rates: [
      { label: 'Per pengangkutan', idr: 350000 },
    ],
    includes: ['driver', 'dumping fee'],
    excludes: ['bongkar labour', 'lansir > std'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'furniture',
    label_en:    'Furniture',
    label_id:    'Furnitur',
    description: 'Lemari, sofa, kasur, meja — pindah dengan penanganan hati-hati.',
    rate_model:  'per_trip',
    header:      'Antar furnitur',
    subtext:     'Tarif per trip dalam kota Yogya. Tambah kenek (+Rp 50–100k) dan jasa rakit ulang opsional.',
    default_rates: [
      { label: 'Dalam kota', idr: 175000 },
    ],
    includes: ['driver', 'fuel'],
    excludes: ['kenek (+Rp 50-100k)', 'assembly'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'appliances',
    label_en:    'Appliances',
    label_id:    'Elektronik',
    description: 'Kulkas, mesin cuci, AC, TV — diantar dan diturunkan aman.',
    rate_model:  'per_trip',
    header:      'Antar elektronik besar',
    subtext:     'Tarif per trip dalam kota termasuk tali pengikat dasar. Pemasangan dan biaya naik tangga tidak termasuk.',
    default_rates: [
      { label: 'Dalam kota', idr: 175000 },
    ],
    includes: ['driver', 'fuel', 'tie-down'],
    excludes: ['install', 'stairs surcharge'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'motorbike',
    label_en:    'Motorbike',
    label_id:    'Antar Motor',
    description: 'Antar 1+ unit motor ke kota lain atau ke bengkel — per unit.',
    rate_model:  'per_unit',
    header:      'Antar motor per unit',
    subtext:     'Tarif per unit motor termasuk tali pengikat dan penanganan dasar. Crate-packing dan asuransi opsional.',
    default_rates: [
      { label: 'Dalam kota',         idr: 150000, per: '/unit' },
      { label: 'Magelang',           idr: 399000, per: '/unit' },
      { label: 'Jakarta',            idr: 600000, per: '/unit' },
    ],
    includes: ['tie-down', 'basic care'],
    excludes: ['crate-packing', 'insurance'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'event_logistics',
    label_en:    'Event Gear',
    label_id:    'Logistik Acara',
    description: 'Tenda, kursi, sound system — antar pulang ke venue acara.',
    rate_model:  'daily',
    header:      'Logistik acara per durasi',
    subtext:     'Sewa per durasi (6 / 12 / 24 jam) termasuk sopir dan BBM lokal. Kenek dan parkir luar venue terpisah.',
    default_rates: [
      { label: '6 jam',  idr: 375000 },
      { label: '12 jam', idr: 425000 },
      { label: '24 jam', idr: 525000 },
    ],
    includes: ['driver', 'fuel'],
    excludes: ['kenek', 'parking', 'overnight'],
    imageUrl: CAROUSEL_IMG,
  },
  {
    id:          'market_produce',
    label_en:    'Market Run',
    label_id:    'Pasar/Panen',
    description: 'Belanja pasar (Beringharjo / Gamping) atau angkut hasil panen.',
    rate_model:  'daily',
    header:      'Run pasar / hasil panen',
    subtext:     'Tarif per run cepat masuk-kota atau sewa full-day untuk multi-stop. BBM kembali kosong luar-kota tidak termasuk.',
    default_rates: [
      { label: 'Per run (entry)', idr: 125000 },
      { label: 'Full day',         idr: 400000 },
    ],
    includes: ['driver', 'fuel'],
    excludes: ['kenek', 'luar-kota empty return'],
    imageUrl: CAROUSEL_IMG,
  },
]

// =============================================================================
// BUS_SERVICE_OFFERINGS — Yogyakarta minibus charter catalog (Hiace / Elf /
// Innova / Premio class).
// -----------------------------------------------------------------------------
// June 2026 refactor — collapsed 11 narrow trip-types into 3 super-buckets
// (Airport / Tour / Daily) so the public profile reads tidy + tourist-friendly.
// All historic rate rows are MERGED into the surviving buckets — no data loss.
// =============================================================================
export const BUS_SERVICE_OFFERINGS: readonly ServiceCatalogEntry[] = [
  {
    id:          'airport',
    label_en:    'Airport',
    label_id:    'Antar Bandara',
    description: 'Antar / jemput bandara YIA Kulon Progo atau Adisutjipto.',
    rate_model:  'per_trip',
    header:      'Airport transfers',
    subtext:     'One-way drop or pickup to YIA Kulon Progo or Adisutjipto. Unit + driver + BBM included.',
    default_rates: [
      { label: 'YIA Kulon Progo',   idr: 750000 },
      { label: 'Adisutjipto Yogya', idr: 400000 },
    ],
    includes: ['unit', 'driver', 'BBM'],
    excludes: ['tol', 'parkir', 'overtime'],
  },
  {
    id:          'tour',
    label_en:    'Tour',
    label_id:    'Paket Wisata',
    description: 'Borobudur, Prambanan, Merapi, Dieng, Bromo, Bali — daily / multi-day.',
    rate_model:  'per_destination_package',
    header:      'Tour packages',
    subtext:     'Borobudur, Prambanan, Merapi, Dieng, Bromo, Bali — daily or multi-day. Tap a destination to see the published rate.',
    default_rates: [
      { label: 'Borobudur + Prambanan 1D', idr: 2000000 },
      { label: 'Merapi Sunrise 1D',         idr: 1500000 },
      { label: 'Wisata 3 Candi 1D',         idr: 2500000 },
      { label: 'Dieng 2D1N',                 idr: 1500000, per: '/day' },
      { label: 'Bromo 2D1N',                 idr: 1400000, per: '/day' },
      { label: 'Wali Songo Ziarah 3D',      idr: 4200000 },
      { label: 'Drop Bali (Hiace Premio)',  idr: 10000000 },
      { label: 'Wedding shuttle / day',     idr: 1500000 },
      { label: 'Corporate outing / day',    idr: 1350000 },
      { label: 'Syuting / prewed / day',    idr: 1500000 },
    ],
    includes: ['unit', 'driver', 'BBM'],
    excludes: ['tiket lokasi', 'tamu meals', 'inap sopir (multi-day)'],
  },
  {
    id:          'daily',
    label_en:    'Daily',
    label_id:    'Carter Harian',
    description: 'Full-day hire dalam / luar kota — sopir + BBM termasuk.',
    rate_model:  'daily',
    header:      'Daily charter',
    subtext:     'Full-day hire inside or outside the city — driver and BBM included. 10-hour standard window.',
    default_rates: [
      { label: 'Hiace 10h dalam kota',  idr: 1250000 },
      { label: 'Innova 12h dalam kota', idr:  650000 },
      { label: 'Elf Long 10h',           idr: 1200000 },
      { label: 'Hiace luar kota',        idr: 1650000 },
      { label: 'Hiace Premio luar kota', idr: 1750000 },
    ],
    includes: ['driver', 'BBM'],
    excludes: ['tol', 'parkir', 'makan sopir', 'overtime'],
  },
]

// =============================================================================
// JEEP_SERVICE_OFFERINGS — Yogyakarta jeep tour catalog.
// -----------------------------------------------------------------------------
// Six buckets reflecting the real Yogya jeep market:
//   - temple   — Borobudur / Prambanan / Mendut / Pawon temple route
//   - city     — Malioboro + Kraton + Tamansari + markets + Kotagede silver
//   - offroad  — Merapi Lava Tour (the iconic one), Klangon hill, Kalikuning
//   - beach    — Parangtritis sand-dune + black-sand + Indrayanti / Timang
//   - daily_8h — Full-day open hire (8 hours, do-anything package)
//   - daily_4h — Half-day open hire (4 hours, short window)
//
// Yogya market reference rates (June 2026; founder-overridable in dashboard):
//   - Merapi Lava Tour short  Rp 350k / medium Rp 500k / long Rp 650k (per jeep, ≤4 pax)
//   - Parangtritis 6-hour     Rp 500k (sand dune + sunset)
//   - Temple combo (B+P)      Rp 1.5–2M jeep day rate (entrance fees extra)
//   - 8-hour day hire         Rp 700k–1M
//   - 4-hour half-day         Rp 400k–600k
// Sources: Merapi Adventure, Telkomsel Jelajah, Joglo Wisata, Klook, GetYourGuide.
//
// Hotel/villa pickup + dropoff is standard across all buckets. Tolls, bridge
// fees, attraction entrance tickets, parking, and food (for guests AND
// driver) are NOT included — same language across all 6 entries.
// =============================================================================
export const JEEP_SERVICE_OFFERINGS: readonly ServiceCatalogEntry[] = [
  {
    id:          'temple',
    label_en:    'Temple',
    label_id:    'Candi',
    description: 'Borobudur, Prambanan, Mendut, Pawon — heritage jeep tour with hotel pickup.',
    rate_model:  'per_destination_package',
    header:      'Temple tour packages',
    subtext:     'Open-top jeep ride between the UNESCO heritage temples — Borobudur sunrise / day, Prambanan, plus the smaller Mendut + Pawon stops. Hotel or villa pickup and dropoff included.',
    default_rates: [
      { label: 'Borobudur day trip',                  idr: 850000 },
      { label: 'Prambanan + Ratu Boko sunset',        idr: 750000 },
      { label: 'Borobudur + Prambanan combo (full day)', idr: 1600000 },
      { label: 'Borobudur sunrise + Mendut + Pawon',  idr: 1100000 },
      { label: 'Borobudur + Merapi sunrise combo',    idr: 1800000 },
    ],
    includes: ['jeep + driver', 'fuel', 'hotel/villa pickup + dropoff'],
    excludes: ['temple entrance tickets', 'tolls + bridge fees', 'parking', 'food (guests + driver)'],
  },
  {
    id:          'city',
    label_en:    'City',
    label_id:    'Kota',
    description: 'Malioboro, Kraton, Tamansari, traditional markets — open-jeep city ride.',
    rate_model:  'per_destination_package',
    header:      'City discovery packages',
    subtext:     'Roof-down jeep loop through the city: Malioboro, Kraton, Tamansari, Beringharjo market, Kotagede silver district. Picture-friendly transport with hotel/villa pickup + dropoff.',
    default_rates: [
      { label: 'Malioboro + Kraton + Tamansari',          idr: 450000 },
      { label: 'Beringharjo market + Pasar Ngasem',       idr: 400000 },
      { label: 'Kotagede silver + Kasongan pottery',      idr: 550000 },
      { label: 'Full city loop (4 stops, 5 hours)',       idr: 750000 },
      { label: 'Evening street-food + night-market crawl', idr: 500000 },
    ],
    includes: ['jeep + driver', 'fuel', 'hotel/villa pickup + dropoff'],
    excludes: ['food + drinks', 'shopping', 'tolls + bridge fees', 'parking', 'driver meals'],
  },
  {
    id:          'offroad',
    label_en:    'Offroad',
    label_id:    'Offroad',
    description: 'Merapi Lava Tour, Klangon hill, Kalikuning — proper 4×4 adventure.',
    rate_model:  'per_destination_package',
    header:      'Offroad adventure packages',
    subtext:     'The iconic Jogja Lava Tour up the slopes of Merapi — bunker Kaliadem, Batu Alien, Stonehenge replica, water-splash river crossing. Hotel/villa pickup included.',
    default_rates: [
      { label: 'Merapi Lava Tour — short (1.5–2h)',  idr: 400000 },
      { label: 'Merapi Lava Tour — medium (3–4h)',   idr: 550000 },
      { label: 'Merapi Lava Tour — long (4–5h)',     idr: 700000 },
      { label: 'Merapi sunrise jeep (pre-dawn pickup)', idr: 800000 },
      { label: 'Klangon hill + Kalikuning offroad',  idr: 600000 },
    ],
    includes: ['jeep + driver', 'fuel', 'hotel/villa pickup + dropoff', 'helmet (sunrise)'],
    excludes: ['bunker entrance + spot tickets', 'tolls + bridge fees', 'parking', 'food (guests + driver)'],
  },
  {
    id:          'beach',
    label_en:    'Beach',
    label_id:    'Pantai',
    description: 'Parangtritis sand dunes, Indrayanti, Timang — beach-to-beach 4×4.',
    rate_model:  'per_destination_package',
    header:      'Beach adventure packages',
    subtext:     'Offroad jeep from city to the south coast — Parangtritis black sand, Gumuk Pasir sand dunes, Indrayanti, Timang gondola beach. Sunset variant most popular. Hotel/villa pickup + dropoff included.',
    default_rates: [
      { label: 'Parangtritis sunset + sand dunes (5h)', idr: 600000 },
      { label: 'Parangtritis + Goa Cemara (6h)',         idr: 700000 },
      { label: 'Indrayanti + Pok Tunggal beach hop',     idr: 850000 },
      { label: 'Timang gondola + Pantai Sundak',         idr: 900000 },
      { label: 'Full south-coast 3-beach day',            idr: 1100000 },
    ],
    includes: ['jeep + driver', 'fuel', 'hotel/villa pickup + dropoff'],
    excludes: ['beach entry + gondola tickets', 'tolls + bridge fees', 'parking', 'food (guests + driver)'],
  },
  {
    id:          'daily_8h',
    label_en:    '8h Day Hire',
    label_id:    'Sewa 8 Jam',
    description: 'Full-day open jeep hire (8 hours) — point anywhere, driver waits.',
    rate_model:  'daily',
    header:      '8-hour full-day jeep hire',
    subtext:     'Open block — tell the driver where you want to go and they take you. Eight straight hours, hotel/villa pickup + dropoff included. Multiple stops welcome.',
    default_rates: [
      { label: 'In-city + Sleman / Bantul (8h)', idr: 850000 },
      { label: 'Out-of-town 8h block',           idr: 1100000 },
      { label: 'Overtime per hour',              idr:  100000, per: '/hr' },
    ],
    includes: ['jeep + driver', 'fuel (in-city)', 'hotel/villa pickup + dropoff', '8 hours of driving'],
    excludes: ['fuel surcharge (out-of-town)', 'tolls + bridge fees', 'parking', 'attraction tickets', 'food (guests + driver)'],
  },
  {
    id:          'daily_4h',
    label_en:    '4h Half-Day',
    label_id:    'Sewa 4 Jam',
    description: 'Half-day open jeep hire (4 hours) — quick city loop or sunset run.',
    rate_model:  'daily',
    header:      '4-hour half-day jeep hire',
    subtext:     'Short block for a quick city loop, sunset run, or temple-and-back. Hotel/villa pickup + dropoff included. Best for travellers on tight schedules.',
    default_rates: [
      { label: 'In-city half-day (4h)',     idr: 500000 },
      { label: 'Half-day + 1 attraction',   idr: 650000 },
      { label: 'Overtime per hour',         idr: 100000, per: '/hr' },
    ],
    includes: ['jeep + driver', 'fuel (in-city)', 'hotel/villa pickup + dropoff', '4 hours of driving'],
    excludes: ['fuel surcharge (out-of-town)', 'tolls + bridge fees', 'parking', 'attraction tickets', 'food (guests + driver)'],
  },
]

// -----------------------------------------------------------------------------
// Public helper — pick the right catalog for the vehicle vertical. Truck,
// minibus, and jeep each carry a per-service rate catalog; the public profile
// renders the badge / rate-panel UX uniformly for all three.
// -----------------------------------------------------------------------------
export function getServiceCatalog(
  vehicleType: 'truck' | 'minibus' | 'jeep',
): readonly ServiceCatalogEntry[] {
  if (vehicleType === 'truck')   return TRUCK_SERVICE_OFFERINGS
  if (vehicleType === 'minibus') return BUS_SERVICE_OFFERINGS
  return JEEP_SERVICE_OFFERINGS
}
