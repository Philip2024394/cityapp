import { ImageResponse } from 'next/og'

// Shared WhatsApp Status flyer renderer used by every vertical's
// `src/lib/<vertical>/flyer.tsx`. Each vertical wraps this with a
// FlyerInput → SharedFlyerInput adapter so the per-vertical lib still
// exposes `renderFlyer` + `FlyerInput` with vertical-typed schema.
//
// Section heights (sum to 1920):
//   • Top band     180px  — theme background + Kita2u wordmark + label
//   • Hero block   700px  — circular profile photo, name, city
//   • Service list 600px  — up to 3 stacked cards (name + price)
//   • CTA footer   440px  — WhatsApp button + public URL
export const FLYER_WIDTH  = 1080
export const FLYER_HEIGHT = 1920
export const FLYER_BAND_TOP    = 180
export const FLYER_BAND_HERO   = 700
export const FLYER_BAND_LIST   = 600
export const FLYER_BAND_FOOTER = 440

export type FlyerService = { label: string; price: number | null }

export type SharedFlyerInput = {
  vertical_slug:     string  // e.g. 'handyman' — used in the public URL
  vertical_label:    string  // e.g. 'handyman' — shown in the top band
  display_name:      string
  theme_color?:      string | null
  button_text_color?: string | null
  profile_image_url?: string | null
  city?:             string | null
  whatsapp_e164?:    string | null
  slug:              string
  services:          FlyerService[]  // already-picked, max 3
}

export function formatRupiah(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return 'Ask for price'
  // Indonesian thousands grouping with dots. Avoid Intl in the edge
  // renderer to keep render deterministic across runtimes.
  const s = Math.round(n).toString()
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '.'
    out += s[i]
  }
  return `Rp ${out}`
}

function publicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` ||
    'https://kita2u.com'
  )
}

// Accepts '#RRGGBB' or '#RGB' (case-insensitive). Strips anything else
// so a malformed theme_color can't leak CSS into the rendered SVG.
export function sanitiseHex(v: string | null | undefined): string | null {
  if (!v) return null
  const s = v.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return s
  return null
}

export function renderSharedFlyer(input: SharedFlyerInput): ImageResponse {
  const accent     = sanitiseHex(input.theme_color)      || '#FACC15'
  const ink        = sanitiseHex(input.button_text_color) || '#111111'
  const services   = input.services.slice(0, 3)
  const waDigits   = (input.whatsapp_e164 ?? '').replace(/[^\d]/g, '')
  const waLabel    = waDigits ? `wa.me/${waDigits}` : 'Tap to chat'
  const profileUrl = `${publicOrigin().replace(/^https?:\/\//, '')}/${input.vertical_slug}/${input.slug}`

  return new ImageResponse(
    (
      <div
        style={{
          width:  `${FLYER_WIDTH}px`,
          height: `${FLYER_HEIGHT}px`,
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* 1. Top band — theme color with Kita2u wordmark. */}
        <div
          style={{
            height: `${FLYER_BAND_TOP}px`,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: ink,
              letterSpacing: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span>kita2u</span>
            <span style={{ fontSize: 36, fontWeight: 700, opacity: 0.8 }}>·</span>
            <span style={{ fontSize: 32, fontWeight: 700, opacity: 0.85 }}>{input.vertical_label}</span>
          </div>
        </div>

        {/* 2. Hero block — circular avatar + name + city. */}
        <div
          style={{
            height: `${FLYER_BAND_HERO}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 60px',
            background: '#FFFFFF',
          }}
        >
          <div
            style={{
              width: 360, height: 360,
              borderRadius: 360,
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: `8px solid ${accent}`,
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            }}
          >
            {input.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={input.profile_image_url}
                alt={input.display_name}
                width={360}
                height={360}
                style={{ width: 360, height: 360, objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  fontSize: 200, fontWeight: 900,
                  color: ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 360, height: 360,
                }}
              >
                {(input.display_name[0] ?? 'K').toUpperCase()}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 72, fontWeight: 900,
              color: '#111111',
              marginTop: 36,
              textAlign: 'center',
              lineHeight: 1.05,
              maxWidth: 960,
              display: 'flex',
            }}
          >
            {input.display_name}
          </div>
          {input.city ? (
            <div
              style={{
                fontSize: 28, fontWeight: 600,
                color: '#444',
                marginTop: 14,
                display: 'flex',
              }}
            >
              {input.city}
            </div>
          ) : null}
        </div>

        {/* 3. Service cards — up to 3 stacked. */}
        <div
          style={{
            height: `${FLYER_BAND_LIST}px`,
            padding: '24px 60px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            background: '#FAFAFA',
          }}
        >
          {services.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                fontSize: 36, color: '#888',
              }}
            >
              Custom pricing — message for a quote
            </div>
          ) : services.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: '#FFFFFF',
                borderRadius: 28,
                display: 'flex',
                alignItems: 'center',
                padding: '0 36px 0 0',
                overflow: 'hidden',
                boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  width: 18,
                  alignSelf: 'stretch',
                  background: accent,
                  display: 'flex',
                }}
              />
              <div
                style={{
                  paddingLeft: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 46, fontWeight: 800,
                    color: '#111111',
                    display: 'flex',
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 30, fontWeight: 600,
                    color: '#555',
                    marginTop: 6,
                    display: 'flex',
                  }}
                >
                  Starting at
                </div>
              </div>
              <div
                style={{
                  fontSize: 50, fontWeight: 900,
                  color: '#111111',
                  display: 'flex',
                }}
              >
                {formatRupiah(s.price)}
              </div>
            </div>
          ))}
        </div>

        {/* 4. CTA footer. */}
        <div
          style={{
            height: `${FLYER_BAND_FOOTER}px`,
            background: '#0B0B0B',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 60px',
          }}
        >
          <div
            style={{
              fontSize: 30, fontWeight: 700,
              color: '#BBB',
              marginBottom: 18,
              display: 'flex',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Book on WhatsApp
          </div>
          <div
            style={{
              background: accent,
              borderRadius: 999,
              padding: '28px 64px',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              maxWidth: 960,
            }}
          >
            <div
              style={{
                fontSize: 48, fontWeight: 900,
                color: ink,
                display: 'flex',
              }}
            >
              Tap to book
            </div>
            <div
              style={{
                fontSize: 40, fontWeight: 700,
                color: ink,
                opacity: 0.7,
                display: 'flex',
              }}
            >
              ·
            </div>
            <div
              style={{
                fontSize: 44, fontWeight: 800,
                color: ink,
                display: 'flex',
              }}
            >
              {waLabel}
            </div>
          </div>
          <div
            style={{
              fontSize: 28, fontWeight: 600,
              color: '#DDD',
              marginTop: 26,
              display: 'flex',
            }}
          >
            {profileUrl}
          </div>
        </div>
      </div>
    ),
    {
      width:  FLYER_WIDTH,
      height: FLYER_HEIGHT,
      headers: {
        'Content-Type':        'image/png',
        'Content-Disposition': 'attachment; filename="kita2u-flyer.png"',
        'Cache-Control':       'private, max-age=60',
      },
    },
  )
}

// Generic helper for verticals whose service_photos is a flat array of
// { url, name?, price_idr? } entries. Takes up to 3 entries; falls back
// to hourly/day rate columns when no entries exist.
export type FlatPhotoEntry = {
  url?:        string
  name?:       string
  price_idr?:  number | null
}
export function pickFromFlatPhotos(
  photos: FlatPhotoEntry[] | null | undefined,
  fallback: { hourly?: number | null; day?: number | null; hourlyLabel?: string; dayLabel?: string },
): FlyerService[] {
  const out: FlyerService[] = []
  for (const e of photos ?? []) {
    if (out.length >= 3) break
    if (!e) continue
    const label = (e.name && e.name.trim()) || 'Service'
    out.push({ label, price: e.price_idr ?? null })
  }
  if (out.length === 0) {
    if (fallback.hourly != null) {
      out.push({ label: fallback.hourlyLabel || 'Hour', price: fallback.hourly })
    }
    if (fallback.day != null && out.length < 3) {
      out.push({ label: fallback.dayLabel || 'Day · 8h', price: fallback.day })
    }
  }
  return out.slice(0, 3)
}

// Helper for verticals whose service_photos is keyed by service id and
// the entries are rich objects with optional name/price.
export type KeyedPhotoEntry = {
  url?:        string
  name?:       string
  price_idr?:  number | null
}
export function pickFromKeyedPhotos(
  photos: Record<string, Array<KeyedPhotoEntry | string>> | null | undefined,
  labelFor: (key: string) => string,
  priceForKey: (key: string) => number | null,
): FlyerService[] {
  const out: FlyerService[] = []
  for (const [bucket, entries] of Object.entries(photos ?? {})) {
    if (!Array.isArray(entries)) continue
    for (const e of entries) {
      if (out.length >= 3) break
      if (typeof e === 'string') {
        out.push({ label: labelFor(bucket), price: priceForKey(bucket) })
      } else {
        const name = e?.name?.trim() || labelFor(bucket)
        out.push({ label: name, price: e?.price_idr ?? priceForKey(bucket) })
      }
    }
    if (out.length >= 3) break
  }
  return out.slice(0, 3)
}
