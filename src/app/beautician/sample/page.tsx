'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, User, Home, Hotel, Building2 } from 'lucide-react'
import {
  BEAUTICIAN_SERVICES_OFFERED,
  type BeauticianProviderPublic,
  type BeauticianServiceOffered,
} from '@/lib/beautician/types'

// /beautician/sample — preview page for the new ProviderCard design.
// Renders all four demo beauticians using the proposed card layout
// (hero-strip cover + theme accent + mini portfolio strip) so the
// founder can A/B against the live /beautician marketplace before
// committing the new design.

export default function SampleCardPage() {
  const [providers, setProviders] = useState<BeauticianProviderPublic[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/beautician/marketplace?city=Yogyakarta', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { providers?: BeauticianProviderPublic[] }) => {
        setProviders(j.providers ?? [])
      })
      .catch(() => { /* swallow — preview-only page */ })
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-[100dvh] bg-stone-100 text-stone-900">
      <header className="max-w-3xl mx-auto px-4 pt-8 pb-4">
        <Link href="/beautician" className="text-[12px] text-stone-500 hover:text-stone-900">
          ← back to live marketplace
        </Link>
        <h1 className="text-[24px] font-black mt-2">Card design preview</h1>
        <p className="text-[13px] text-stone-600 mt-1 max-w-md">
          Sample of the proposed card layout: hero-strip cover banner +
          theme-color left border + mini portfolio thumb row.
          Live marketplace cards are untouched.
        </p>
      </header>

      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-4">
        {loading && <div className="text-stone-500 text-[13px]">Loading…</div>}
        {!loading && providers.length === 0 && (
          <div className="text-stone-500 text-[13px]">No demo beauticians returned.</div>
        )}
        {providers.map((p) => (
          <SampleCard key={p.slug} provider={p} />
        ))}
      </div>
    </main>
  )
}

// New card design — what we'd apply to the live marketplace.
function SampleCard({ provider: p }: { provider: BeauticianProviderPublic }) {
  const theme = p.theme_color || '#EC4899'

  // Primary category drives the specialty pill colour + label.
  const cats: BeauticianServiceOffered[] = (() => {
    if (p.marketplace_categories && p.marketplace_categories.length > 0) {
      return p.marketplace_categories as BeauticianServiceOffered[]
    }
    return []
  })()
  const primary = cats[0]
  const mainLabel = primary
    ? BEAUTICIAN_SERVICES_OFFERED.find((s) => s.id === primary)?.label ?? primary
    : null

  // Pull up to 3 service photos for the mini-portfolio strip. Prefer
  // photos from the primary category; fall back to whatever has data.
  const sp = p.service_photos ?? {}
  const portfolioThumbs: string[] = (() => {
    const out: string[] = []
    if (primary && Array.isArray(sp[primary])) {
      for (const item of sp[primary] ?? []) {
        if (out.length >= 3) break
        if (item && typeof item === 'object' && typeof item.url === 'string') {
          out.push(item.url)
        }
      }
    }
    if (out.length < 3) {
      for (const arr of Object.values(sp)) {
        if (!Array.isArray(arr)) continue
        for (const item of arr) {
          if (out.length >= 3) break
          const url = typeof item === 'string' ? item : (item as { url?: string })?.url
          if (url && !out.includes(url)) out.push(url)
        }
        if (out.length >= 3) break
      }
    }
    return out
  })()

  // Location icons.
  const locs = new Set(p.service_locations ?? [])
  const locItems: Array<{ key: string; icon: typeof Home; label: string }> = []
  if (locs.has('home'))  locItems.push({ key: 'home',  icon: Home,      label: 'Home' })
  if (locs.has('hotel')) locItems.push({ key: 'hotel', icon: Hotel,     label: 'Hotel' })
  if (locs.has('villa')) locItems.push({ key: 'villa', icon: Building2, label: 'Villa' })

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-0.5"
      style={{
        borderLeft: `3px solid ${theme}`,
        boxShadow: `0 4px 14px ${theme}25, 0 0 0 1px rgba(0,0,0,0.06)`,
      }}
    >
      {/* HERO STRIP — cover banner with a soft gradient fade so the
          avatar + name area below stays readable on any image. */}
      <div className="relative h-[110px] bg-stone-200">
        {p.cover_image_url && (
          <img
            src={p.cover_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Fade out the bottom 40% of the cover so the body content
            isn't competing with banner imagery. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 50%, rgba(255,255,255,0.92) 100%)',
          }}
        />
        {/* Rating chip — pinned top-right of the cover. */}
        {p.rating != null && p.rating > 0 && (
          <div
            className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full border shadow-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <Star className="w-3.5 h-3.5" fill="#FACC15" stroke="none" />
            <span className="text-[13px] font-extrabold text-black tabular-nums leading-none">
              {p.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* BODY — pulled up slightly to overlap the fade so the avatar
          sits half-on-cover, half-on-card (classic profile pattern). */}
      <div className="px-4 pb-4 -mt-5 relative z-10">
        <div className="flex items-end gap-3 mb-2">
          <div className="relative shrink-0">
            {p.profile_image_url
              ? <img
                  src={p.profile_image_url}
                  alt={p.display_name}
                  className="w-16 h-16 rounded-2xl object-cover bg-white"
                  style={{
                    border: `3px solid ${theme}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                  }}
                />
              : <div
                  className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-[22px] font-black text-stone-700"
                  style={{ border: `3px solid ${theme}` }}
                >{p.display_name[0]}</div>}
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full"
              style={{
                background: p.availability === 'online' ? '#22C55E'
                          : p.availability === 'busy'   ? '#F97316'
                          :                                '#9CA3AF',
                border: '2px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
              aria-hidden
            />
          </div>

          <div className="min-w-0 flex-1 pb-0.5">
            <div className="text-[17px] font-black text-stone-900 truncate leading-tight">{p.display_name}</div>
            {p.city && (
              <div className="text-[12px] text-stone-500 flex items-center gap-1 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: theme }} />
                {p.city}
              </div>
            )}
          </div>

          {/* Specialty pill — theme-tinted, replaces the plain
              uppercase label. */}
          {mainLabel && (
            <div
              className="shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider"
              style={{
                background: `${theme}18`,
                color: theme,
                border: `1px solid ${theme}50`,
              }}
            >
              {mainLabel}
            </div>
          )}
        </div>

        {p.bio?.trim() && (
          <p
            className="text-[12.5px] leading-snug text-stone-600 mb-3"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {p.bio.replace(/\s*\n\s*/g, ' ')}
          </p>
        )}

        {/* Mini portfolio strip — up to 3 thumbs of the beautician's
            work. Each thumb tints with the theme color via a thin top
            border so the row feels brand-consistent. */}
        {portfolioThumbs.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {portfolioThumbs.map((url, i) => (
              <div
                key={url + i}
                className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-100"
                style={{ boxShadow: `inset 0 0 0 1px ${theme}30` }}
              >
                <img
                  src={url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Bottom row — Home/Hotel/Villa on the left, Profile on the
            right. Same proportions as the live card. */}
        <div className="flex items-center justify-between gap-3">
          {locItems.length > 0 ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {locItems.map((it) => (
                <span
                  key={it.key}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-stone-700"
                >
                  <it.icon className="w-[16px] h-[16px]" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
                  {it.label}
                </span>
              ))}
            </div>
          ) : <span />}

          <Link
            href={`/beautician/${p.slug}`}
            className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0 hover:brightness-110 transition shadow-md"
            style={{
              background: theme,
              color: '#FFFFFF',
            }}
          >
            <User className="w-3.5 h-3.5" strokeWidth={2.5} />
            Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
