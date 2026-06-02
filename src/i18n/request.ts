// Server-side locale resolver — runs once per request before any RSC
// renders. Reads the NEXT_LOCALE cookie; falls back to the default when
// missing or invalid. The resolved locale + the matching message catalog
// flow into every component via getTranslations() / useTranslations().

import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config'

export default getRequestConfig(async () => {
  const jar = await cookies()
  const raw = jar.get(LOCALE_COOKIE)?.value
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE

  // Dynamic import means each language's catalog is its own chunk — only
  // the active locale's bytes ship to the request.
  const messages = (await import(`../../messages/${locale}.json`)).default

  return { locale, messages }
})
