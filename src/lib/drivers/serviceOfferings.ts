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
// =============================================================================
export const BUS_SERVICE_OFFERINGS: readonly ServiceCatalogEntry[] = [
  {
    id:          'airport_transfer',
    label_en:    'Airport Run',
    label_id:    'Antar Bandara',
    description: 'Antar / jemput bandara YIA Kulon Progo atau Adisutjipto.',
    rate_model:  'per_trip',
    header:      'Antar / jemput bandara',
    subtext:     'Tarif per trip 1 arah termasuk unit, sopir, dan BBM. Tol, parkir, dan overtime di luar standar tidak termasuk.',
    default_rates: [
      { label: 'YIA Kulon Progo',  idr: 750000 },
      { label: 'Adisutjipto Yogya', idr: 400000 },
    ],
    includes: ['unit', 'driver', 'BBM', '1 stop'],
    excludes: ['tol', 'parkir', 'overtime'],
  },
  {
    id:          'city_charter',
    label_en:    'City Charter',
    label_id:    'Carter Dalam',
    description: 'Carter dalam kota Yogya — Hiace, Innova, atau Elf per hari.',
    rate_model:  'daily',
    header:      'Carter dalam kota',
    subtext:     'Tarif per hari sudah termasuk sopir dan BBM dalam kota. Tol, parkir, makan sopir, dan overtime terpisah.',
    default_rates: [
      { label: 'Hiace 10h', idr: 1250000 },
      { label: 'Innova',    idr:  650000 },
      { label: 'Elf',       idr: 1200000 },
    ],
    includes: ['driver', 'BBM in-city'],
    excludes: ['tol', 'parkir', 'makan sopir', 'overtime'],
  },
  {
    id:          'out_of_town',
    label_en:    'Out of Town',
    label_id:    'Luar Kota',
    description: 'Carter luar kota — Magelang, Solo, Semarang dan sekitarnya.',
    rate_model:  'daily',
    header:      'Carter luar kota',
    subtext:     'Tarif per hari termasuk sopir dan BBM. Tol, parkir, makan sopir, dan inap sopir untuk multi-hari terpisah.',
    default_rates: [
      { label: 'Hiace',     idr: 1650000 },
      { label: 'Premio',    idr: 1750000 },
      { label: 'Elf Long',  idr: 1500000 },
    ],
    includes: ['driver', 'BBM'],
    excludes: ['tol', 'parkir', 'makan sopir', 'inap sopir if multi-day'],
  },
  {
    id:          'tour_package',
    label_en:    'Tour Package',
    label_id:    'Paket Wisata',
    description: 'Paket wisata 1 hari — Borobudur, Prambanan, Merapi, dll.',
    rate_model:  'per_destination_package',
    header:      'Paket wisata 1 hari',
    subtext:     'Tarif per paket destinasi sudah termasuk unit, sopir, dan BBM. Beberapa paket sudah termasuk tiket — konfirmasi langsung.',
    default_rates: [
      { label: 'Borobudur + Prambanan', idr: 2000000 },
      { label: 'Merapi Sunrise',         idr: 1500000 },
      { label: 'Wisata 3 Candi',         idr: 2500000 },
    ],
    includes: ['unit', 'driver', 'BBM', 'sometimes tickets'],
    excludes: ['tamu meals', 'guide tambahan'],
  },
  {
    id:          'wedding_shuttle',
    label_en:    'Wedding',
    label_id:    'Antar Undangan',
    description: 'Antar undangan / keluarga ke venue pernikahan.',
    rate_model:  'daily',
    header:      'Antar undangan pernikahan',
    subtext:     'Tarif per hari atau per trip 1 arah. Dekorasi, makan sopir, dan overtime tidak termasuk.',
    default_rates: [
      { label: 'Hiace per hari', idr: 1500000 },
      { label: 'Per trip',       idr:  750000 },
    ],
    includes: ['unit', 'driver', 'BBM'],
    excludes: ['dekor', 'makan sopir', 'overtime'],
  },
  {
    id:          'corporate_outing',
    label_en:    'Corporate',
    label_id:    'Outing',
    description: 'Outing kantor / employee gathering — Hiace atau Elf Long.',
    rate_model:  'daily',
    header:      'Corporate outing',
    subtext:     'Tarif per hari termasuk sopir dan BBM. Konsumsi, EO, tol, dan parkir di luar tarif.',
    default_rates: [
      { label: 'Hiace per hari',     idr: 1350000 },
      { label: 'Elf Long per hari',  idr: 1500000 },
    ],
    includes: ['driver', 'BBM'],
    excludes: ['konsumsi', 'EO', 'tol/parkir'],
  },
  {
    id:          'study_tour',
    label_en:    'Study Tour',
    label_id:    'Study Tour',
    description: 'Study tour sekolah / kampus — bus untuk rombongan pelajar.',
    rate_model:  'daily',
    header:      'Study tour',
    subtext:     'Tarif harian atau paket per-pax untuk multi-hari. Tiket masuk lokasi dan makan siswa tidak termasuk.',
    default_rates: [
      { label: 'Hiace per hari',  idr: 1350000 },
      { label: 'Per-pax 2 hari',  idr: 2500000, per: '/pax' },
    ],
    includes: ['driver', 'BBM', 'sometimes guide'],
    excludes: ['tiket masuk', 'makan siswa'],
  },
  {
    id:          'pilgrimage',
    label_en:    'Pilgrimage',
    label_id:    'Ziarah',
    description: 'Ziarah Wali Songo, makam keluarga, atau religious tour.',
    rate_model:  'multi_day',
    header:      'Ziarah / religious tour',
    subtext:     'Paket multi-hari termasuk sopir, BBM, dan tol. Inap sopir, tiket lokasi, dan makan jamaah tidak termasuk.',
    default_rates: [
      { label: 'Wali Songo 3 hari',     idr: 4200000 },
      { label: 'Family makam per hari', idr: 1400000 },
    ],
    includes: ['driver', 'BBM', 'tol'],
    excludes: ['inap sopir', 'tiket', 'makan jamaah'],
  },
  {
    id:          'bali_transit',
    label_en:    'Bali Drop',
    label_id:    'Drop Bali',
    description: 'Drop ke Bali / Lombok — Hiace Premio one-way atau per hari.',
    rate_model:  'per_destination_package',
    header:      'Drop Bali / lintas pulau',
    subtext:     'Paket drop sudah termasuk ferry, tol, parkir, dan makan + inap sopir. Tiket wisata dan makan tamu terpisah.',
    default_rates: [
      { label: 'Hiace Premio drop',     idr: 10000000 },
      { label: 'Per-day basis',         idr:  1650000 },
    ],
    includes: ['unit', 'driver', 'BBM', 'tol', 'parkir', 'makan + inap sopir', 'ferry'],
    excludes: ['tiket wisata', 'tamu meals'],
  },
  {
    id:          'multi_day_tour',
    label_en:    'Multi-Day',
    label_id:    'Tour Multi-Hari',
    description: 'Tour multi-hari — Dieng, Bromo, Karimun Jawa, dll.',
    rate_model:  'multi_day',
    header:      'Tour multi-hari',
    subtext:     'Tarif per hari sudah termasuk sopir, BBM, dan kadang homestay. Tiket lokasi dan makan tamu tidak termasuk.',
    default_rates: [
      { label: 'Dieng 2D1N',     idr: 1500000, per: '/day' },
      { label: 'Bromo 2D1N',     idr: 1400000, per: '/day' },
      { label: 'Karimun 3D2N',   idr: 1500000, per: '/day' },
    ],
    includes: ['unit', 'driver', 'BBM', 'sometimes homestay'],
    excludes: ['tiket', 'tamu meals'],
  },
  {
    id:          'film_crew',
    label_en:    'Film/Prewed',
    label_id:    'Syuting',
    description: 'Mobilisasi tim syuting / prewed / video produksi.',
    rate_model:  'daily',
    header:      'Syuting / prewed shoot',
    subtext:     'Tarif per hari standar. Stand-by malam, overtime, dan izin lokasi negosiasi langsung.',
    default_rates: [
      { label: 'Per hari', idr: 1500000 },
    ],
    includes: ['driver', 'BBM'],
    excludes: ['stand-by malam', 'overtime', 'izin lokasi'],
  },
  {
    id:          'umroh_family',
    label_en:    'Umrah Family',
    label_id:    'Antar Umroh',
    description: 'Antar keluarga pemberangkatan umroh dari rumah ke bandara.',
    rate_model:  'per_trip',
    header:      'Antar keluarga umroh',
    subtext:     'Tarif per trip 1 arah ke bandara termasuk bagasi. Tol, parkir, dan waktu tunggu di luar standar terpisah.',
    default_rates: [
      { label: 'Per trip', idr: 900000 },
    ],
    includes: ['unit', 'driver', 'BBM', 'luggage'],
    excludes: ['tol', 'parkir', 'tunggu'],
  },
]

// -----------------------------------------------------------------------------
// Public helper — pick the right catalog for the vehicle vertical. Truck and
// minibus are the only verticals that carry a per-service rate catalog;
// jeep keeps the simple driver-published rate flow (no panel) for now.
// -----------------------------------------------------------------------------
export function getServiceCatalog(
  vehicleType: 'truck' | 'minibus',
): readonly ServiceCatalogEntry[] {
  return vehicleType === 'truck' ? TRUCK_SERVICE_OFFERINGS : BUS_SERVICE_OFFERINGS
}
