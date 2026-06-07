'use client'

// ============================================================================
// /add-ons/[id] detail client.
//
// Renders the full description + a sticky "Aktifkan" CTA. The CTA does the
// auth gate: not logged in → /login?next=/add-ons/[id]; logged in →
// POST /api/addons/[id]/enable then redirect to dashboard config page.
// ============================================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CreditCard, MessageCircleQuestion, Sparkles, Check,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  MessageCircleQuestion, CreditCard, Sparkles,
}

type Props = {
  id:           string
  slug:         string
  iconName:     string
  label:        string
  tagline:      string
  description:  string
  priceLabel:   string
  billingKind:  'free-forever' | 'paid'
  available:    boolean
}

export default function AddonDetailClient({
  id, slug, iconName, label, tagline, description,
  priceLabel, billingKind, available,
}: Props) {
  const router = useRouter()
  const Icon = ICONS[iconName] ?? MessageCircleQuestion

  const [enabledStatus, setEnabledStatus] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Check if the signed-in user already has this addon
  useEffect(() => {
    let cancelled = false
    fetch('/api/addons/list', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { items: Array<{ id: string; enabled: boolean; status: string | null }> } | null) => {
        if (cancelled || !j) return
        const row = j.items.find((x) => x.id === id)
        if (row?.enabled) setEnabledStatus(row.status)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id])

  async function activate() {
    setWorking(true)
    setFeedback(null)
    try {
      const r = await fetch(`/api/addons/${id}/enable`, {
        method: 'POST',
        cache: 'no-store',
      })
      if (r.status === 401) {
        // Not logged in — bounce to login with return path.
        router.push(`/login?next=${encodeURIComponent(`/add-ons/${slug}`)}`)
        return
      }
      if (r.status === 402) {
        setFeedback('Tambahan ini perlu pembayaran. Checkout akan datang sebentar lagi.')
        return
      }
      if (r.status === 409) {
        setFeedback('Tambahan ini belum tersedia.')
        return
      }
      if (!r.ok) {
        setFeedback('Gagal mengaktifkan. Coba lagi.')
        return
      }
      const j = await r.json() as { status?: string }
      setEnabledStatus(j.status ?? 'free')
      // Send the user to the per-addon settings page in the dashboard
      // (the dashboard segment will figure out the user's primary vertical).
      router.push(`/dashboard/addons/${slug}`)
    } catch {
      setFeedback('Gagal mengaktifkan. Coba lagi.')
    } finally {
      setWorking(false)
    }
  }

  const isAlreadyEnabled = enabledStatus !== null

  return (
    <article className="max-w-3xl mx-auto px-4 pt-6 pb-32">
      {/* Hero */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center"
          style={{ background: '#FACC15' }}
          aria-hidden
        >
          <Icon className="w-9 h-9 sm:w-10 sm:h-10" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-tight">{label}</h1>
          <p className="mt-1 text-[14px] text-[#52525B] leading-relaxed">{tagline}</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center text-[12px] font-extrabold px-2.5 py-1 rounded-full"
              style={{
                background: billingKind === 'free-forever' ? '#DCFCE7' : '#FFFBEA',
                color:      billingKind === 'free-forever' ? '#166534' : '#7C5300',
              }}
            >
              {priceLabel}
            </span>
            {isAlreadyEnabled && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full"
                style={{ background: '#DCFCE7', color: '#166534' }}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                Aktif
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="rounded-2xl border border-[#E4E4E7] bg-white p-4 sm:p-5 mb-6">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#71717A] mb-2">Apa yang kamu dapat</h2>
        <p className="text-[14px] text-[#0A0A0A] leading-relaxed whitespace-pre-line">{description}</p>
      </section>

      {/* What stays the same / honesty strip */}
      <section className="rounded-2xl bg-[#FAFAFA] p-4 mb-6 text-[12.5px] text-[#52525B] leading-relaxed">
        <strong className="text-[#0A0A0A]">Bisa dimatikan kapan saja</strong> dari dashboard.
        Tambahan tidak mengubah cara profilmu yang sudah ada bekerja —
        hanya menambahkan bagian baru.
      </section>

      {feedback && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] font-bold text-amber-900">
          {feedback}
        </div>
      )}

      {/* Sticky bottom CTA on mobile, inline on desktop */}
      <div
        className="fixed bottom-0 left-0 right-0 sm:static sm:mt-2 bg-white sm:bg-transparent border-t border-[#F1F1F1] sm:border-none px-4 py-3 sm:p-0 z-20"
        style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="max-w-3xl mx-auto">
          {!available ? (
            <button
              type="button"
              disabled
              className="w-full min-h-[52px] rounded-2xl px-6 bg-[#F4F4F5] text-[#71717A] font-extrabold text-[15px]"
            >
              Segera hadir
            </button>
          ) : isAlreadyEnabled ? (
            <Link
              href={`/dashboard/addons/${slug}`}
              className="w-full min-h-[52px] flex items-center justify-center rounded-2xl px-6 bg-[#0A0A0A] text-white font-extrabold text-[15px] active:scale-[0.99] transition"
            >
              Atur Tambahan →
            </Link>
          ) : (
            <button
              type="button"
              onClick={activate}
              disabled={working}
              className="w-full min-h-[52px] rounded-2xl px-6 bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-[#0A0A0A] font-extrabold text-[15px] active:scale-[0.99] transition shadow-[0_8px_22px_rgba(250,204,21,0.35)] disabled:opacity-60"
            >
              {working ? 'Mengaktifkan…' : 'Aktifkan'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
