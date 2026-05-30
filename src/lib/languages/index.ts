/**
 * Languages a driver can declare on their profile. Surface choice driven by
 * the Indonesian inbound-tourism mix (English first, then Chinese / Arabic
 * / Dutch / Japanese / Korean / etc.). ISO 639-1 codes for the column;
 * flag emojis for the public profile flag-row.
 *
 * Flag policy: every language gets a single representative country flag.
 * Indonesian uses the Indonesian flag; English uses the UK flag (more
 * widely recognised than US in SE Asia tourism context); Chinese uses the
 * PRC flag (target Mandarin speakers, the largest Asian inbound segment).
 */

export type LanguageId =
  | 'id' | 'en' | 'zh' | 'ar' | 'fr' | 'nl' | 'de' | 'ja' | 'ko'
  | 'es' | 'ru' | 'hi' | 'ms' | 'jv' | 'th' | 'vi' | 'it' | 'pt'

export type LanguageDef = {
  id:       LanguageId
  /** English label — used on the dashboard chip picker. */
  label:    string
  /** Native script label — surfaces as the chip's secondary text. */
  native:   string
  /** Unicode flag emoji rendered next to the language on profile pages. */
  flag:     string
}

export const LANGUAGES: ReadonlyArray<LanguageDef> = [
  { id: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { id: 'en', label: 'English',    native: 'English',          flag: '🇬🇧' },
  { id: 'zh', label: 'Chinese',    native: '中文',              flag: '🇨🇳' },
  { id: 'ar', label: 'Arabic',     native: 'العربية',           flag: '🇸🇦' },
  { id: 'ja', label: 'Japanese',   native: '日本語',             flag: '🇯🇵' },
  { id: 'ko', label: 'Korean',     native: '한국어',             flag: '🇰🇷' },
  { id: 'nl', label: 'Dutch',      native: 'Nederlands',       flag: '🇳🇱' },
  { id: 'fr', label: 'French',     native: 'Français',         flag: '🇫🇷' },
  { id: 'de', label: 'German',     native: 'Deutsch',          flag: '🇩🇪' },
  { id: 'es', label: 'Spanish',    native: 'Español',          flag: '🇪🇸' },
  { id: 'it', label: 'Italian',    native: 'Italiano',         flag: '🇮🇹' },
  { id: 'pt', label: 'Portuguese', native: 'Português',        flag: '🇵🇹' },
  { id: 'ru', label: 'Russian',    native: 'Русский',          flag: '🇷🇺' },
  { id: 'hi', label: 'Hindi',      native: 'हिन्दी',             flag: '🇮🇳' },
  { id: 'ms', label: 'Malay',      native: 'Bahasa Melayu',    flag: '🇲🇾' },
  { id: 'jv', label: 'Javanese',   native: 'Basa Jawa',        flag: '🇮🇩' },
  { id: 'th', label: 'Thai',       native: 'ภาษาไทย',          flag: '🇹🇭' },
  { id: 'vi', label: 'Vietnamese', native: 'Tiếng Việt',       flag: '🇻🇳' },
] as const

export function getLanguage(id: string): LanguageDef | null {
  return LANGUAGES.find((l) => l.id === id) ?? null
}

export function languagesByIds(ids: ReadonlyArray<string> | null | undefined): LanguageDef[] {
  if (!ids || ids.length === 0) return []
  return ids
    .map((id) => getLanguage(id))
    .filter((l): l is LanguageDef => l !== null)
}
