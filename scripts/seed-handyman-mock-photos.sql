-- ============================================================================
-- Seed mock service_photos for the four demo tukang
--
-- Image source: one neutral imagekit placeholder shared across every card
-- (the existing dashboard background scene — already on the allowlist).
-- Founder swaps these for real trade photos via /dashboard/handyman/services.
--
-- Indonesian trade catalog driving the mock data (per-specialty service
-- examples + typical prices). Prices are mid-range Yogyakarta / Bali rates
-- as of 2026 — opinion-grade, not authoritative. Founder should tweak.
-- ============================================================================

-- Reuse an existing imagekit URL the dashboard already serves so every
-- placeholder lives on a host on the isAllowedImageUrl allowlist.
-- ----------------------------------------------------------------------------

-- Pak Joko — electrical / ac_service / appliance_repair (Yogyakarta)
update public.handyman_providers
set service_photos = '[
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Pasang Stop Kontak Baru",
    "description": "Tambah stop kontak di kamar / dapur / WC. Kabel + box + cover. Harga sudah termasuk material standar.",
    "price_idr": 85000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "AC Service Cuci + Freon",
    "description": "Cuci unit indoor + outdoor + cek tekanan freon. 1 unit AC ≤ 1 PK. Bonus diagnosa kebocoran ringan.",
    "price_idr": 150000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Service Kulkas Bocor / Mati",
    "description": "Cek kompresor, ganti relay/overload, isi freon kulkas R134a. Bisa di tempat untuk kulkas 1 / 2 pintu.",
    "price_idr": 350000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Ganti MCB Sekring Listrik",
    "description": "Ganti MCB single phase / 3 phase. Termasuk pemeriksaan beban tiap line + amankan grounding.",
    "price_idr": 110000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Pasang Lampu LED Plafon",
    "description": "Pasang downlight LED 5/9/12W di plafon gypsum atau beton. Sudah termasuk lobang + finishing.",
    "price_idr": 55000
  }
]'::jsonb
where slug = 'demo-hp-pak-joko';

-- Pak Eko — painting / general_repair / roof_repair (Yogyakarta)
update public.handyman_providers
set service_photos = '[
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Cat Tembok Rumah per m²",
    "description": "Painting cat dasar + topcoat 2 lapis. Avian / Dulux / Nippon Paint. Persiapan dinding + finishing rapi.",
    "price_idr": 35000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Cat Plafon Anti Bocor",
    "description": "Lapis plafon dengan waterproofing + cat ulang. Cocok untuk plafon yang sudah noda kuning.",
    "price_idr": 125000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Reparasi Atap Genteng Bocor",
    "description": "Inspeksi titik bocor, lem genteng, ganti genteng pecah / sealant alur. Garansi 3 bulan.",
    "price_idr": 250000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Ganti Genteng Pecah per Lembar",
    "description": "Termasuk material genteng standar Kanmuri / Cisangkan. Pemasangan rapi tanpa rusak baris sebelah.",
    "price_idr": 25000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Patch Tembok Retak Rambut",
    "description": "Tambal retak rambut dinding interior dengan plamir + cat ulang area kecil. Per area max 1 m².",
    "price_idr": 80000
  }
]'::jsonb
where slug = 'demo-hp-pak-eko';

-- Pak Budi — plumbing / general_repair (Bali — Denpasar)
update public.handyman_providers
set service_photos = '[
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Service WC Mampet",
    "description": "Sedot pakai pompa + bersih lubang kloset. Jika perlu bongkar sambungan pipa, harga tambahan sesuai material.",
    "price_idr": 100000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Pasang Pompa Air Baru",
    "description": "Pasang pompa Sanyo / Shimizu jet pump untuk sumur 7-10 meter. Termasuk wiring + uji tekanan.",
    "price_idr": 350000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Pipa Bocor — Sambung & Lem",
    "description": "Pipa PVC bocor di sambungan / retak. Pakai lem PVC + double-fitting jika perlu. Lokasi indoor & outdoor.",
    "price_idr": 80000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Ganti Kran Wastafel / Shower",
    "description": "Bongkar kran lama + pasang baru. Material kran disediakan pelanggan atau saya beli (struk dilampirkan).",
    "price_idr": 65000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Service Septic Tank — Sedot",
    "description": "Koordinasi dengan armada sedot tinja kerjasama. Cek juga ventilasi septic + saluran pembuangan.",
    "price_idr": 400000
  }
]'::jsonb
where slug = 'demo-hp-pak-budi';

-- Mas Andi — carpentry / furniture_assembly / tiling (Bali — Kuta)
update public.handyman_providers
set service_photos = '[
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Pasang IKEA Lemari Pakaian",
    "description": "Pasang PAX / KLEPPSTAD / HEMNES sesuai instruksi IKEA. Termasuk leveling + sekrup ke dinding bila perlu.",
    "price_idr": 200000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Rak Buku Custom Kayu Jati",
    "description": "Custom design rak buku 3-5 tingkat dari kayu jati / mahoni. Termasuk amplas + finishing waterbase.",
    "price_idr": 500000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Pasang Keramik Lantai per m²",
    "description": "Pasang keramik / granit ukuran standar 40x40 / 60x60. Ongkos saja, material disediakan pelanggan.",
    "price_idr": 85000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Pasang Keramik Kamar Mandi Komplit",
    "description": "Bongkar lama + pasang baru — lantai + dinding kamar mandi standar 4-6 m². Termasuk waterproofing dasar.",
    "price_idr": 1200000
  },
  {
    "url": "https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106",
    "name": "Reparasi Pintu Kayu Macet",
    "description": "Pintu macet / engsel kendor / kunci miring. Perbaikan tanpa ganti daun pintu. Termasuk minyak engsel.",
    "price_idr": 150000
  }
]'::jsonb
where slug = 'demo-hp-mas-andi';
