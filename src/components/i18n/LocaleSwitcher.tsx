'use client'

// Two-flag locale toggle. Sits under the landing CTAs (and anywhere else
// the founder wants to expose language choice). Writes the NEXT_LOCALE
// cookie and reloads so server-rendered translations swap immediately.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LOCALES, LOCALE_COOKIE, type Locale } from '@/i18n/config'
import { useLocale, useTranslations } from 'next-intl'

const FLAGS: Record<Locale, string> = {
  id: '🇮🇩',
  en: '🇬🇧',
}

const LABELS: Record<Locale, string> = {
  id: 'ID',
  en: 'EN',
}

export default function LocaleSwitcher({
  className,
  variant = 'pill',
}: {
  className?: string
  /** 'pill' = soft pill on a darkish bg (the landing). 'inline' = bare
   *  buttons for use against a light bg in headers / footers. */
  variant?: 'pill' | 'inline'
}) {
  const active = useLocale() as Locale
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const t = useTranslations('localeSwitcher')

  function setLocale(next: Locale) {
    if (next === active) return
    // Cookie path '/' so it covers the whole site; max-age 1 year so the
    // choice persists across sessions. SameSite=Lax so first-tap from a
    // shared link keeps the user's preference.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    startTransition(() => {
      router.refresh()
    })
  }

  const baseBtn =
    'inline-flex items-center justify-center gap-1 px-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider active:scale-95 transition disabled:opacity-60'

  return (
    <div
      role="group"
      aria-label={t('ariaLabel')}
      className={`inline-flex items-center gap-1.5 ${className ?? ''}`}
    >
      {LOCALES.map((loc) => {
        const isActive = loc === active
        const ariaKey = loc === 'id' ? 'indonesianAria' : 'englishAria'
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            disabled={pending || isActive}
            aria-label={t(ariaKey)}
            aria-pressed={isActive}
            className={baseBtn}
            style={{
              minHeight: 30,
              minWidth: 50,
              background:
                variant === 'pill'
                  ? isActive
                    ? '#FACC15'
                    : 'rgba(255,255,255,0.92)'
                  : isActive
                    ? '#FACC15'
                    : '#F4F4F5',
              color: '#0A0A0A',
              border: isActive ? '1.5px solid #EAB308' : '1px solid rgba(0,0,0,0.10)',
              boxShadow: isActive ? '0 4px 10px rgba(250,204,21,0.45)' : 'none',
            }}
          >
            <span aria-hidden>{FLAGS[loc]}</span>
            <span>{LABELS[loc]}</span>
          </button>
        )
      })}
    </div>
  )
}
