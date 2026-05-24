'use client'
import { useEffect, useState } from 'react'
import { getStoredPartnerSlug } from '@/lib/partners/attribution'

// Live "FROM PARTNER" badge that appears on the booking screen whenever a
// partner attribution is active in localStorage. Renders nothing if no
// partner is set, so it's safe to drop anywhere on /cari/rider or
// /r/[slug]. The driver sees the same context in their FCM push body.

type PartnerInfo = { name: string; commission_rate: number }

export default function PartnerBookingBadge({ fareIdr }: { fareIdr?: number | null }) {
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    const s = getStoredPartnerSlug()
    if (!s) return
    setSlug(s)
    fetch(`/api/partners/${encodeURIComponent(s)}/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { partner?: PartnerInfo } | null) => {
        if (j?.partner) setPartner(j.partner)
      })
      .catch(() => { /* silent — badge stays hidden */ })
  }, [])

  if (!slug || !partner) return null

  const commission = fareIdr && fareIdr > 0
    ? Math.round(fareIdr * (partner.commission_rate || 0.08))
    : null

  return (
    <div
      className="rounded-xl px-3 py-2 flex items-center gap-2 text-[11px]"
      style={{
        background: 'rgba(250,204,21,0.12)',
        border: '1px solid rgba(250,204,21,0.40)',
      }}
    >
      <span aria-hidden className="text-[14px]">🏨</span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-brand uppercase tracking-wider text-[9px] leading-none mb-0.5">
          Partner referral
        </div>
        <div className="font-bold text-ink truncate">{partner.name}</div>
        {commission !== null && (
          <div className="text-ink/60 text-[10px] mt-0.5">
            Driver owes mitra Rp {commission.toLocaleString('id-ID')} ({Math.round((partner.commission_rate || 0.08) * 100)}%)
          </div>
        )}
      </div>
    </div>
  )
}
