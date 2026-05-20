// ============================================================================
// Tour-guide language list — canonical codes + display labels + flag emoji.
// ----------------------------------------------------------------------------
// Optimised for Indonesian tourism markets (Yogya + Bali + Lombok primary).
// Add new entries as supply demands; codes match the text[] stored on
// drivers.tour_guide_languages.
// ============================================================================

export type TourLanguageCode = 'id' | 'en' | 'zh' | 'ja' | 'ko' | 'nl' | 'de' | 'fr'

export type TourLanguage = {
  code: TourLanguageCode
  label: string         // English label for international tourists
  labelId: string       // Bahasa label for local drivers selecting in dashboard
  flag: string          // single emoji
}

export const TOUR_LANGUAGES: ReadonlyArray<TourLanguage> = [
  { code: 'id', label: 'Bahasa Indonesia', labelId: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English',          labelId: 'Bahasa Inggris',   flag: '🇬🇧' },
  { code: 'zh', label: 'Mandarin',         labelId: 'Bahasa Mandarin',  flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese',         labelId: 'Bahasa Jepang',    flag: '🇯🇵' },
  { code: 'ko', label: 'Korean',           labelId: 'Bahasa Korea',     flag: '🇰🇷' },
  { code: 'nl', label: 'Dutch',            labelId: 'Bahasa Belanda',   flag: '🇳🇱' },
  { code: 'de', label: 'German',           labelId: 'Bahasa Jerman',    flag: '🇩🇪' },
  { code: 'fr', label: 'French',           labelId: 'Bahasa Perancis',  flag: '🇫🇷' },
]

const BY_CODE = new Map<string, TourLanguage>(TOUR_LANGUAGES.map((l) => [l.code, l]))

export function getLanguageByCode(code: string): TourLanguage | null {
  return BY_CODE.get(code) ?? null
}
