'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  QrCode, Upload, Loader2, CheckCircle2, AlertTriangle, Download,
} from 'lucide-react'

// ============================================================================
// QrPaymentFlow — universal QR + receipt-upload checkout component.
// ----------------------------------------------------------------------------
// Drop into any plan page:
//
//   <QrPaymentFlow
//     product="rental_company_monthly"
//     onActivated={() => router.push('/dashboard/rentals?upgraded=1')}
//   />
//
// What the user sees:
//   1. Step list (instructions)
//   2. QR code image fetched from admin_qr_codes for the right amount
//   3. Bank / account name + exact amount to pay (Rp 38.000 or Rp 350.000)
//   4. File picker for the screenshot
//   5. Submit button → POST /api/me/receipts/upload
//   6. Success card with "Akun aktif dalam beberapa detik" message
// ============================================================================

export type QrProduct =
  | 'subscription'
  | 'subscription_yearly'
  | 'rental_company_monthly'
  | 'rental_company_yearly'
  | 'tour_guide_monthly'
  | 'tour_guide_yearly'

type QrCodeRow = {
  id: string
  label: string
  amount_idr: number
  image_url: string
  bank_name: string | null
  account_name: string | null
  account_number: string | null
}

const AMOUNT_BY_PRODUCT: Record<QrProduct, number> = {
  subscription:           38_000,
  subscription_yearly:    350_000,
  rental_company_monthly: 38_000,
  rental_company_yearly:  350_000,
  tour_guide_monthly:     38_000,
  tour_guide_yearly:      350_000,
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

export default function QrPaymentFlow({
  product,
  onActivated,
}: {
  product: QrProduct
  onActivated?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [qr, setQr] = useState<QrCodeRow | null>(null)
  const [qrErr, setQrErr] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [picked, setPicked] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activated, setActivated] = useState(false)
  const amount = AMOUNT_BY_PRODUCT[product]

  // Fetch the active QR for this amount on mount. Public-read RLS so
  // anonymous visitors can preview the upgrade page before login.
  useEffect(() => {
    let cancelled = false
    setQrLoading(true)
    fetch(`/api/me/qr-code?amount=${amount}`, { cache: 'no-store' })
      .then(async (r) => {
        if (cancelled) return
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          setQrErr(j?.error || 'QR belum di-set admin. Silakan coba lagi nanti.')
          setQr(null)
          return
        }
        const j = (await r.json()) as { qr_code: QrCodeRow | null }
        setQr(j.qr_code)
      })
      .catch(() => {
        if (!cancelled) setQrErr('Gagal load QR — coba refresh halaman.')
      })
      .finally(() => { if (!cancelled) setQrLoading(false) })
    return () => { cancelled = true }
  }, [amount])

  function onPick(files: FileList | null) {
    setSubmitError(null)
    const f = files?.[0]
    if (!f) return
    if (!ALLOWED_MIME.includes(f.type)) {
      setSubmitError('Format harus JPG, PNG, atau WebP.')
      return
    }
    if (f.size > MAX_BYTES) {
      setSubmitError('File terlalu besar (max 5MB).')
      return
    }
    setPicked(f)
  }

  async function handleSubmit() {
    if (!picked) {
      setSubmitError('Pilih screenshot pembayaran dulu.')
      return
    }
    setSubmitError(null)
    setSubmitting(true)

    const form = new FormData()
    form.set('product', product)
    form.set('receipt', picked)
    if (note.trim()) form.set('note', note.trim())

    try {
      const res = await fetch('/api/me/receipts/upload', { method: 'POST', body: form })
      const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!res.ok || !j.ok) throw new Error(j?.error || `Upload gagal (${res.status})`)
      setActivated(true)
      onActivated?.()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Upload gagal.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────
  if (activated) {
    return (
      <div className="card p-5 space-y-3 border-2 border-green-500/40" style={{ background: 'rgba(34,197,94,0.10)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.30)' }}>
            <CheckCircle2 className="w-5 h-5 text-green-400" strokeWidth={2.75} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold text-ink leading-tight">Akun kamu aktif!</div>
            <div className="text-[12px] text-muted">Listing kamu langsung tayang dalam beberapa detik.</div>
          </div>
        </div>
        <div className="rounded-xl p-3 text-[12px] text-bg/85 leading-snug" style={{ background: 'rgba(0,0,0,0.30)' }}>
          Admin akan verifikasi pembayaran dalam <strong className="text-brand">24 jam</strong>.
          Kalau ada masalah, admin akan WhatsApp kamu langsung.
        </div>
      </div>
    )
  }

  // ── QR not loaded / missing ───────────────────────────────────────
  if (qrLoading) {
    return (
      <div className="card p-6 flex items-center justify-center gap-2 text-muted text-[13px]">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading QR…
      </div>
    )
  }

  if (qrErr || !qr) {
    return (
      <div className="card p-5 space-y-3" style={{ borderColor: 'rgba(239,68,68,0.40)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div className="text-[14px] font-extrabold text-ink">QR belum di-set admin</div>
        </div>
        <p className="text-[12px] text-muted leading-snug">
          {qrErr || `Untuk amount Rp ${amount.toLocaleString('id-ID')} belum ada QR aktif. Hubungi admin lewat WhatsApp di streetlocallive@gmail.com.`}
        </p>
      </div>
    )
  }

  // ── Main flow ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Step-list instructions */}
      <div className="card p-4 space-y-2.5">
        <div className="text-[13px] font-extrabold text-brand uppercase tracking-wider flex items-center gap-1.5">
          <QrCode className="w-4 h-4" /> Cara bayar
        </div>
        <ol className="text-[13px] text-ink leading-snug space-y-2 list-decimal pl-5">
          <li>
            <strong>Scan QR di bawah</strong> dengan app bank atau e-wallet kamu — BCA, BRI, Mandiri, GoPay, OVO, DANA, ShopeePay, semua support QRIS.
          </li>
          <li>
            Bayar <strong className="text-brand">persis Rp {qr.amount_idr.toLocaleString('id-ID')}</strong> — jangan dibulatkan, admin verifikasi via nominal persis.
          </li>
          <li>
            Screenshot bukti transfer / receipt sukses.
          </li>
          <li>
            Upload screenshot di bawah → tap <strong>Submit</strong>.
          </li>
          <li>
            <strong className="text-brand">Akun aktif dalam beberapa detik</strong> begitu upload sukses. Admin verifikasi dalam 24 jam.
          </li>
        </ol>
      </div>

      {/* QR display card */}
      <div className="card p-4 space-y-3" style={{ background: '#fff', color: '#0a0a0c' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-extrabold leading-tight" style={{ color: '#0a0a0c' }}>{qr.label}</div>
            {qr.bank_name && <div className="text-[12px] mt-0.5" style={{ color: '#525458' }}>{qr.bank_name}</div>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: '#525458' }}>Bayar persis</div>
            <div className="text-[22px] font-extrabold tabular-nums leading-none" style={{ color: '#0a0a0c' }}>
              Rp {qr.amount_idr.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden bg-white flex items-center justify-center" style={{ border: '1px solid #e5e7eb' }}>
          <img
            src={qr.image_url}
            alt={qr.label}
            className="w-full max-w-[320px] h-auto object-contain"
            loading="eager"
          />
        </div>
        {(qr.account_name || qr.account_number) && (
          <div className="text-[12px] text-center leading-snug" style={{ color: '#374151' }}>
            {qr.account_name && <div className="font-extrabold">{qr.account_name}</div>}
            {qr.account_number && <div className="tabular-nums">{qr.account_number}</div>}
          </div>
        )}
        <a
          href={qr.image_url}
          download={`qris-${qr.amount_idr}.png`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95"
          style={{ background: '#0a0a0c', color: '#FACC15', border: '1px solid #0a0a0c' }}
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
          Save QR image
        </a>
      </div>

      {/* Upload receipt */}
      <div className="card p-4 space-y-3">
        <div className="text-[13px] font-extrabold text-brand uppercase tracking-wider flex items-center gap-1.5">
          <Upload className="w-4 h-4" /> Upload bukti transfer
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => onPick(e.target.files)}
        />

        {picked ? (
          <div className="space-y-2">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
              <img
                src={URL.createObjectURL(picked)}
                alt="Receipt preview"
                className="w-full h-auto max-h-[260px] object-contain bg-bg"
              />
            </div>
            <button
              type="button"
              onClick={() => { setPicked(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              className="text-[12px] text-muted hover:text-ink"
            >
              Ganti file
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[4/3] sm:aspect-[16/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition hover:bg-white/5 active:scale-[0.99]"
            style={{ borderColor: 'rgba(250,204,21,0.45)' }}
          >
            <Upload className="w-7 h-7 text-brand" strokeWidth={2.5} />
            <div className="text-[14px] font-extrabold text-ink">Pilih screenshot pembayaran</div>
            <div className="text-[11px] text-muted">JPG, PNG, atau WebP · max 5MB</div>
          </button>
        )}

        <label className="block space-y-1.5">
          <span className="text-[11px] font-extrabold text-muted uppercase tracking-wider">Catatan untuk admin (opsional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Mis: bayar via GoPay, ref: 12345…"
            className="w-full bg-bg text-ink placeholder:text-white/40 border border-black/85 rounded-xl px-3 py-2.5 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-bg/40 transition resize-none"
          />
        </label>

        {submitError && (
          <div className="rounded-xl p-3 text-[12px] text-red-200 font-bold" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)' }}>
            {submitError}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !picked}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            : <><CheckCircle2 className="w-4 h-4" strokeWidth={2.75} /> Submit & activate</>}
        </button>

        <p className="text-[11px] text-muted leading-snug text-center">
          Akun aktif dalam beberapa detik. Admin verifikasi receipt dalam 24 jam — kalau ada masalah, admin WhatsApp kamu di {/* placeholder, admin will configure */}
          <Link href="mailto:streetlocallive@gmail.com" className="text-brand hover:underline">streetlocallive@gmail.com</Link>.
        </p>
      </div>
    </div>
  )
}
