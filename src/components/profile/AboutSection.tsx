'use client'
import { Languages, Award, MapPin } from 'lucide-react'

// "About" card — bio paragraph + optional metadata strips (languages,
// certifications, service area). All inputs nullable so caller doesn't
// need to gate visibility — empty arrays / null just don't render.

export default function AboutSection({
  bio,
  languages,
  certifications,
  city,
  serviceArea,
  title = 'About',
}: {
  bio:          string | null | undefined
  languages?:   string[] | null
  certifications?: string[] | null
  city?:        string | null
  serviceArea?: string | null
  title?:       string
}) {
  const hasLangs  = languages && languages.length > 0
  const hasCerts  = certifications && certifications.length > 0
  const hasArea   = !!(city || serviceArea)
  const hasBio    = !!(bio && bio.trim())
  if (!hasBio && !hasLangs && !hasCerts && !hasArea) return null

  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-ink/70">{title}</h2>
      <div className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-3">
        {hasBio && (
          <p className="text-[14px] text-ink/90 leading-relaxed whitespace-pre-wrap">
            {bio}
          </p>
        )}
        {hasArea && (
          <Row icon={MapPin} label="Area">
            {[city, serviceArea].filter(Boolean).join(' · ')}
          </Row>
        )}
        {hasLangs && (
          <Row icon={Languages} label="Languages">
            {languages!.map(formatLang).join(', ')}
          </Row>
        )}
        {hasCerts && (
          <Row icon={Award} label="Certifications">
            <div className="flex flex-wrap gap-1.5">
              {certifications!.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.30)' }}
                >
                  {c}
                </span>
              ))}
            </div>
          </Row>
        )}
      </div>
    </section>
  )
}

function Row({
  icon: Icon, label, children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-brand shrink-0 mt-0.5" strokeWidth={2.25} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink/55">{label}</div>
        <div className="text-[13px] text-ink/85 mt-0.5">{children}</div>
      </div>
    </div>
  )
}

// id → Bahasa Indonesia, en → English etc. Falls back to the raw code
// when unknown so we don't blank-out unfamiliar entries.
function formatLang(code: string): string {
  const map: Record<string, string> = {
    id: 'Bahasa Indonesia',
    en: 'English',
    de: 'Deutsch',
    nl: 'Nederlands',
    fr: 'Français',
    ja: '日本語',
    ko: '한국어',
    zh: '中文',
    es: 'Español',
    it: 'Italiano',
    ru: 'Русский',
    ar: 'العربية',
  }
  return map[code.toLowerCase()] || code
}
