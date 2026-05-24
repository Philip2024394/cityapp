// ============================================================================
// Tour-guide language list — canonical codes + display labels + flag emoji.
// ----------------------------------------------------------------------------
// Optimised for Indonesian tourism markets (Yogya + Bali + Lombok primary).
// Add new entries as supply demands; codes match the text[] stored on
// tour_guide_listings.languages.
//
// Indonesian ('id') is the platform's MAIN language — every tour guide has
// it by default and the editor enforces it (can't be unchecked). Other
// languages are optional add-ons the guide opts into.
// ============================================================================

export type TourLanguageCode =
  | 'id'  // Bahasa Indonesia — ALWAYS the main, never removable
  | 'en'  // English
  | 'ar'  // Arabic
  | 'zh'  // Mandarin Chinese
  | 'ja'  // Japanese
  | 'ko'  // Korean
  | 'nl'  // Dutch
  | 'de'  // German
  | 'fr'  // French
  | 'es'  // Spanish

export type TourLanguage = {
  code: TourLanguageCode
  label: string         // English label for international tourists
  labelId: string       // Bahasa label for local drivers selecting in dashboard
  flag: string          // single emoji
}

/**
 * MAIN_LANGUAGE_CODE — Indonesian is the platform default. Every tour
 * guide's published profile shows this language first; the dashboard
 * editor checkbox for this code is force-checked + disabled.
 */
export const MAIN_LANGUAGE_CODE: TourLanguageCode = 'id'

export const TOUR_LANGUAGES: ReadonlyArray<TourLanguage> = [
  { code: 'id', label: 'Bahasa Indonesia', labelId: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English',          labelId: 'Bahasa Inggris',   flag: '🇬🇧' },
  { code: 'ar', label: 'Arabic',           labelId: 'Bahasa Arab',      flag: '🇸🇦' },
  { code: 'zh', label: 'Mandarin',         labelId: 'Bahasa Mandarin',  flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese',         labelId: 'Bahasa Jepang',    flag: '🇯🇵' },
  { code: 'ko', label: 'Korean',           labelId: 'Bahasa Korea',     flag: '🇰🇷' },
  { code: 'nl', label: 'Dutch',            labelId: 'Bahasa Belanda',   flag: '🇳🇱' },
  { code: 'de', label: 'German',           labelId: 'Bahasa Jerman',    flag: '🇩🇪' },
  { code: 'fr', label: 'French',           labelId: 'Bahasa Perancis',  flag: '🇫🇷' },
  { code: 'es', label: 'Spanish',          labelId: 'Bahasa Spanyol',   flag: '🇪🇸' },
]

const BY_CODE = new Map<string, TourLanguage>(TOUR_LANGUAGES.map((l) => [l.code, l]))

export function getLanguageByCode(code: string): TourLanguage | null {
  return BY_CODE.get(code) ?? null
}

/**
 * Resolve a stored string[] of language codes into the full TourLanguage
 * records, with Indonesian guaranteed at index 0 even if the stored array
 * omits it or has it later. Unknown codes are dropped.
 *
 *   resolveDisplayLanguages(['en','zh'])       → [id, en, zh]
 *   resolveDisplayLanguages(['nl','id','en'])  → [id, nl, en]
 *   resolveDisplayLanguages([])                → [id]
 *   resolveDisplayLanguages(undefined)         → [id]
 */
export function resolveDisplayLanguages(codes: string[] | null | undefined): TourLanguage[] {
  const main = BY_CODE.get(MAIN_LANGUAGE_CODE)!
  if (!codes || codes.length === 0) return [main]
  const rest: TourLanguage[] = []
  const seen = new Set<string>([MAIN_LANGUAGE_CODE])
  for (const c of codes) {
    if (seen.has(c)) continue
    const lang = BY_CODE.get(c)
    if (!lang) continue
    rest.push(lang)
    seen.add(c)
  }
  return [main, ...rest]
}
