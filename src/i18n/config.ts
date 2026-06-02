// Locale registry. Add a locale here + drop a `messages/<code>.json` file
// and it's wired up everywhere — request.ts, the LocaleSwitcher chips,
// the cookie validator. Don't hand-edit cookies elsewhere.

export const LOCALES = ['id', 'en'] as const

export type Locale = (typeof LOCALES)[number]

/** Default when the visitor has never picked a language. CityDrivers is
 *  primarily an Indonesian product — English is the secondary opt-in for
 *  tourist customers, not the default. */
export const DEFAULT_LOCALE: Locale = 'id'

/** Cookie name that next-intl + LocaleSwitcher both read/write. Standard
 *  next-intl convention. */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
