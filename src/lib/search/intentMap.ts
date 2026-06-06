// ============================================================================
// Search intent map — maps Bahasa Indonesia + English keywords to a target
// vertical/route. Used by both:
//   (a) the /explore search bar (Phase 1, fuzzy intent routing)
//   (b) /api/search (Phase 2, cross-vertical DB lookup hints)
//
// Editing rules:
// - Lowercase only. Normalisation strips accents and punctuation before
//   matching, so "Potong Rambut!" and "potong rambut" both match.
// - Keep both Bahasa AND English keywords for every category — the
//   visitor's IP+locale doesn't dictate what they type.
// - Synonyms can be loose ("hp" → handyman covers phone-repair searches);
//   precision tuning happens when traffic data tells us what users
//   actually search for.
// ============================================================================

// CityDrivers-side intents (rental, ride, parcel) are intentionally NOT in
// this union — Kita2u search must never route into the driver app per the
// 2026-06-06 brand-split direction. If a customer types "sewa motor" or
// "ojek", the intent ranker returns 0 hits and /explore offers the
// cross-vertical /search fallback inside Kita2u.
export type IntentId =
  | 'food' | 'beautician' | 'handyman' | 'laundry' | 'massage'
  | 'home-clean' | 'facial' | 'tour'

export type IntentTarget = {
  id:    IntentId
  href:  string
  /** Human-friendly label for the suggestion chip. Bahasa primary. */
  label: { id: string; en: string }
  /** Lowercased keyword variants. Both Bahasa and English. */
  keywords: ReadonlyArray<string>
}

export const INTENTS: ReadonlyArray<IntentTarget> = [
  {
    id: 'food',
    href: '/food',
    label: { id: 'Makanan',   en: 'Food'    },
    keywords: [
      'food','makanan','makan','restoran','restaurant','resto','rumah makan',
      'cafe','kafe','coffee','kopi','bar','pub','klub','club','minuman','minum',
      'sarapan','breakfast','lunch','dinner','warung','warteg','padang',
    ],
  },
  {
    id: 'beautician',
    href: '/beautician',
    label: { id: 'Salon & Kecantikan', en: 'Beauty & Salon' },
    keywords: [
      'beauty','beautician','salon','make up','makeup','make-up',
      'potong rambut','potong','rambut','hair','cut','styling','haircut',
      'kuku','nails','manicure','pedicure','spa',
      'eyelash','bulu mata','lashes','brows','alis',
      'bridal','pengantin','wedding makeup',
      'whitening','smoothing',
    ],
  },
  {
    id: 'facial',
    href: '/facial',
    label: { id: 'Facial', en: 'Facial' },
    keywords: [
      'facial','wajah','muka','perawatan kulit','skin care','skincare',
      'acne','jerawat','anti aging','anti-aging','brightening','hydra',
      'glowing','perawatan wajah',
    ],
  },
  {
    id: 'massage',
    href: '/massage',
    label: { id: 'Pijat & Spa', en: 'Massage & Spa' },
    keywords: [
      'massage','pijat','urut','spa','refleksi','reflexology','therapy',
      'terapis','therapist','therapeutic','aroma','tradisional',
    ],
  },
  {
    id: 'handyman',
    href: '/handyman',
    label: { id: 'Tukang & Service', en: 'Handyman & Repair' },
    keywords: [
      'tukang','handyman','perbaikan','service','servis','repair',
      'listrik','electric','electrical','ac','aircon','air-con',
      'pipa','plumbing','plumber','kayu','carpenter','carpentry',
      'cat','paint','painting','renovasi','renovation',
      'komputer','computer','laptop','pc','hp','handphone',
      'phone','elektronik','electronic','smart tv','tv',
      'kulkas','fridge','mesin cuci','washing machine',
      'tukang las','welding','tukang ledeng',
    ],
  },
  {
    id: 'home-clean',
    href: '/home-clean',
    label: { id: 'Jasa Bersih', en: 'Home Cleaning' },
    keywords: [
      'bersih','bersih-bersih','cleaning','cleaner','bersihkan',
      'rumah','home cleaning','house cleaning','deep clean',
      'asisten rumah tangga','art','rt','helper','pembantu',
      'kantor','office','sapu','pel','vacuum',
    ],
  },
  {
    id: 'laundry',
    href: '/laundry',
    label: { id: 'Laundry', en: 'Laundry' },
    keywords: [
      'laundry','cuci','binatu','setrika','iron','laundry kiloan',
      'antar jemput','dry clean','dry-clean','dry cleaning',
    ],
  },
  {
    id: 'tour',
    href: '/tour',
    label: { id: 'Tour & Wisata', en: 'Tour & Guide' },
    keywords: [
      'tour','wisata','guide','tour guide','tourism','tourist',
      'jalan-jalan','liburan','holiday','vacation','trip','sightseeing',
      'paket wisata','pemandu',
    ],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Match helpers
// ────────────────────────────────────────────────────────────────────────────

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type IntentMatch = {
  intent: IntentTarget
  /** 1.0 = exact full-string keyword hit, 0.0 = no overlap. */
  score:  number
}

/** Rank all intents against a free-text query. Returns sorted DESC by score,
 *  filtered to score > 0. Uses substring + token overlap rather than a fancy
 *  edit-distance algorithm — fast enough for the 11-intent table and easy
 *  to debug when a query routes "wrong". */
export function rankIntents(rawQuery: string): IntentMatch[] {
  const q = normalize(rawQuery)
  if (!q) return []
  const tokens = q.split(' ').filter(Boolean)
  const results: IntentMatch[] = []

  for (const intent of INTENTS) {
    let best = 0
    for (const kw of intent.keywords) {
      const k = normalize(kw)
      // Exact full match — strongest signal.
      if (q === k) { best = Math.max(best, 1.0); continue }
      // Query contains this whole keyword as a substring.
      if (q.includes(k)) { best = Math.max(best, 0.85); continue }
      // Keyword contains the query (user typed a prefix like "salo" → "salon").
      if (k.includes(q) && q.length >= 3) { best = Math.max(best, 0.7); continue }
      // Token overlap — at least one query token matches one keyword token.
      const ktokens = k.split(' ').filter(Boolean)
      const overlap = tokens.filter((t) => ktokens.includes(t)).length
      if (overlap > 0) best = Math.max(best, 0.4 + overlap * 0.1)
    }
    if (best > 0) results.push({ intent, score: best })
  }

  results.sort((a, b) => b.score - a.score)
  return results
}
