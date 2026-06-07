'use client'

// ============================================================================
// /add-ons — public storefront grid.
//
// Same single component drives both the public browse and the logged-in
// experience. We fetch /api/addons/list which already joins the user's
// enabled state when a session exists; the client just renders state.
// ============================================================================

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  CreditCard, MessageCircleQuestion, Sparkles, Check, ChevronRight,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  MessageCircleQuestion,
  CreditCard,
  Sparkles,
}

type AddonRow = {
  id:         string
  slug:       string
  iconName:   string
  label:      string
  tagline:    string
  priceLabel: string
  billing:    { kind: 'free-forever' } | { kind: 'paid'; priceMonthlyIdr: number; trialDays?: number }
  available:  boolean
  enabled:    boolean
  status:     string | null
  paidUntil:  string | null
}

export default function AddonsStoreClient() {
  const [items, setItems]   = useState<AddonRow[]>([])
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoad(true)
    fetch('/api/addons/list', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('fetch failed')))
      .then((j: { items: AddonRow[] }) => { if (!cancelled) setItems(j.items || []) })
      .catch(() => { if (!cancelled) setError('Gagal memuat tambahan. Coba lagi.') })
      .finally(() => { if (!cancelled) setLoad(false) })
    return () => { cancelled = true }
  }, [])

  const available = useMemo(() => items.filter((a) => a.available), [items])
  const comingSoon = useMemo(() => items.filter((a) => !a.available), [items])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Hero */}
      <section className="mb-7 text-center sm:text-left">
        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight leading-tight">
          Buat profilmu bekerja lebih keras
        </h1>
        <p className="mt-2 text-[14px] text-[#52525B] leading-relaxed">
          Tambahan opsional untuk profil Kita2u kamu. Pilih yang sesuai —
          dashboard utama tetap simpel.
        </p>
      </section>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800 font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-[13px] text-[#71717A] font-bold py-6">Memuat…</div>
      ) : (
        <>
          {/* Available add-ons */}
          {available.length > 0 && (
            <ul className="space-y-3 mb-6">
              {available.map((a) => <AddonCard key={a.id} addon={a} />)}
            </ul>
          )}

          {/* Coming soon */}
          {comingSoon.length > 0 && (
            <section>
              <p className="px-1 mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#71717A]">
                Segera Hadir
              </p>
              <ul className="space-y-3 opacity-70">
                {comingSoon.map((a) => <AddonCard key={a.id} addon={a} disabled />)}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Trust strip */}
      <section className="mt-10 pt-6 border-t border-[#F1F1F1] text-[12px] text-[#71717A] leading-relaxed">
        <p>
          Tambahan dapat dimatikan kapan saja dari dashboard. Kita2u tidak
          menyimpan dana customer — semua pembayaran diproses langsung oleh
          penyedia layanan tepercaya (Midtrans untuk pembayaran).
        </p>
      </section>
    </div>
  )
}

function AddonCard({ addon, disabled }: { addon: AddonRow; disabled?: boolean }) {
  const Icon = ICONS[addon.iconName] ?? MessageCircleQuestion
  const href = disabled ? '#' : `/add-ons/${addon.slug}`
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        aria-disabled={disabled || undefined}
        onClick={(e) => { if (disabled) e.preventDefault() }}
        className="flex items-stretch gap-3 p-3 sm:p-4 rounded-2xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition min-h-[96px]"
        style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
      >
        {/* Icon tile */}
        <div
          className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
          style={{ background: '#FACC15' }}
          aria-hidden
        >
          <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-[15px] leading-tight">{addon.label}</span>
              {addon.enabled && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: '#DCFCE7', color: '#166534' }}
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                  Aktif
                </span>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-[#52525B] leading-snug">
              {addon.tagline}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center text-[11px] font-extrabold px-2 py-1 rounded-full"
              style={{
                background: addon.billing.kind === 'free-forever' ? '#DCFCE7' : '#FFFBEA',
                color:      addon.billing.kind === 'free-forever' ? '#166534' : '#7C5300',
              }}
            >
              {addon.priceLabel}
            </span>
            {!disabled && (
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2.5} aria-hidden />
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
