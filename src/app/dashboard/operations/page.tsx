'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Plus, Download, Edit3, Trash2, X as XIcon,
  Calendar, Users, Star, BadgeCheck,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { idr } from '@/lib/format/idr'

// ============================================================================
// /dashboard/operations
// ----------------------------------------------------------------------------
// Driver-only operations console. Three blocks:
//
//   1. THIS MONTH SNAPSHOT — review count + avg, subscription status,
//      and (later) page-view / WhatsApp-click attribution from
//      event tables once those ship.
//
//   2. RIDES LOG — driver-self-entered records of their completed
//      rides. Used for NPWP / Pajak Penghasilan filings, insurance
//      claims, and police questioning about specific dates. The
//      platform never auto-inserts; this is the driver's own logbook.
//
//   3. CSV EXPORT — monthly download of the logbook for offline tax
//      records or accountant handoff.
//
// Stays inside the directory posture under PM 12/2019: we provide
// the form, the driver is the record-of-authority.
// ============================================================================

type LogRow = {
  id: string
  ride_date: string
  pickup_label: string | null
  dropoff_label: string | null
  pitstop_note: string | null
  customer_name: string | null
  customer_phone: string | null
  service: 'person' | 'parcel' | 'food' | 'tour' | 'other' | null
  distance_km: number | null
  amount_idr: number
  notes: string | null
  created_at: string
}

function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthBounds(yyyymm: string): { start: string; end: string } {
  const [y, m] = yyyymm.split('-').map(Number)
  const startD = new Date(Date.UTC(y, m - 1, 1))
  const endD   = new Date(Date.UTC(y, m, 1))
  return { start: startD.toISOString().slice(0, 10), end: endD.toISOString().slice(0, 10) }
}

function pad(s: string): string {
  return `"${s.replace(/"/g, '""')}"`
}

function buildCsv(rows: LogRow[]): string {
  const headers = [
    'Date', 'Service', 'Pickup', 'Dropoff', 'Pit stop',
    'Customer name', 'Customer phone',
    'Distance (km)', 'Amount (IDR)', 'Notes',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push([
      r.ride_date,
      r.service ?? '',
      pad(r.pickup_label ?? ''),
      pad(r.dropoff_label ?? ''),
      pad(r.pitstop_note ?? ''),
      pad(r.customer_name ?? ''),
      pad(r.customer_phone ?? ''),
      r.distance_km ?? '',
      r.amount_idr,
      pad(r.notes ?? ''),
    ].join(','))
  }
  return lines.join('\r\n')
}

function emptyForm() {
  return {
    ride_date: new Date().toISOString().slice(0, 10),
    service: 'person' as LogRow['service'],
    pickup_label: '',
    dropoff_label: '',
    pitstop_note: '',
    customer_name: '',
    customer_phone: '',
    distance_km: '',
    amount_idr: '',
    notes: '',
  }
}

export default function OperationsPage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId]   = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const [month, setMonth]     = useState<string>(currentMonthIso())
  const [rows, setRows]       = useState<LogRow[]>([])
  const [reviewStats, setReviewStats] = useState<{ count: number; avg: number | null }>({ count: 0, avg: null })
  const [subStatus, setSubStatus] = useState<{ status: string; paid_until: string | null } | null>(null)
  // YTD = sum of amount_idr for every logged ride in the current calendar year.
  // Compared client-side against PTKP for the NPWP-threshold alert.
  const [ytdEarnings, setYtdEarnings] = useState<number>(0)
  const [ytdRides, setYtdRides]       = useState<number>(0)

  // Form state — used for both Add and Edit
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  // Boot — auth + initial data
  useEffect(() => {
    if (!supabase) { setError('Supabase not configured.'); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?next=/dashboard/operations')
        return
      }
      setUserId(user.id)

      // Confirm a driver row exists
      const { data: driver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (!driver) {
        setError('Complete driver onboarding before opening the operations log.')
        setLoading(false)
        return
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-load rows + stats whenever month or userId changes
  useEffect(() => {
    if (!supabase || !userId) return
    let cancelled = false
    const { start, end } = monthBounds(month)
    const year = month.slice(0, 4)
    const yearStart = `${year}-01-01`
    const yearEnd   = `${Number(year) + 1}-01-01`
    ;(async () => {
      const [logRes, reviewsRes, subRes, ytdRes] = await Promise.all([
        supabase
          .from('driver_rides_log')
          .select('id, ride_date, pickup_label, dropoff_label, pitstop_note, customer_name, customer_phone, service, distance_km, amount_idr, notes, created_at')
          .gte('ride_date', start)
          .lt('ride_date', end)
          .order('ride_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('rating')
          .eq('driver_user_id', userId)
          .eq('status', 'visible')
          .gte('created_at', `${start}T00:00:00Z`)
          .lt('created_at', `${end}T00:00:00Z`),
        supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('driver_id', userId)
          .maybeSingle(),
        // YTD aggregate — current calendar year only. amount_idr only;
        // we don't need full row data for the rolling sum.
        supabase
          .from('driver_rides_log')
          .select('amount_idr')
          .gte('ride_date', yearStart)
          .lt('ride_date',  yearEnd),
      ])
      if (cancelled) return
      setRows((logRes.data ?? []) as LogRow[])
      const ratings = ((reviewsRes.data ?? []) as { rating: number }[]).map((r) => r.rating)
      const avg = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null
      setReviewStats({ count: ratings.length, avg })
      const ytdRows = (ytdRes.data ?? []) as { amount_idr: number }[]
      setYtdEarnings(ytdRows.reduce((s, r) => s + (r.amount_idr || 0), 0))
      setYtdRides(ytdRows.length)
      setSubStatus(subRes.data
        ? { status: (subRes.data as { status: string }).status, paid_until: (subRes.data as { current_period_end: string | null }).current_period_end }
        : null)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, userId])

  // Totals across the loaded month
  const totals = useMemo(() => {
    const count    = rows.length
    const earnings = rows.reduce((s, r) => s + (r.amount_idr || 0), 0)
    const km       = rows.reduce((s, r) => s + (r.distance_km || 0), 0)
    return { count, earnings, km }
  }, [rows])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setFormOpen(true)
  }
  function openEdit(r: LogRow) {
    setEditingId(r.id)
    setForm({
      ride_date: r.ride_date,
      service: r.service ?? 'person',
      pickup_label: r.pickup_label ?? '',
      dropoff_label: r.dropoff_label ?? '',
      pitstop_note: r.pitstop_note ?? '',
      customer_name: r.customer_name ?? '',
      customer_phone: r.customer_phone ?? '',
      distance_km: r.distance_km != null ? String(r.distance_km) : '',
      amount_idr: r.amount_idr ? String(r.amount_idr) : '',
      notes: r.notes ?? '',
    })
    setFormOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.ride_date) { setError('Ride date is required.'); return }
    setSaving(true)
    const payload = {
      ride_date: form.ride_date,
      service: form.service,
      pickup_label: form.pickup_label.trim() || null,
      dropoff_label: form.dropoff_label.trim() || null,
      pitstop_note: form.pitstop_note.trim() || null,
      customer_name: form.customer_name.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      amount_idr: form.amount_idr ? parseInt(form.amount_idr.replace(/\D/g, ''), 10) : 0,
      notes: form.notes.trim() || null,
    }
    try {
      const url = editingId ? `/api/driver-rides-log/${editingId}` : '/api/driver-rides-log'
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || 'Save failed'); return }
      // Reload the current month's rows
      setFormOpen(false)
      setEditingId(null)
      // Trigger a refetch by bouncing month state through a microtask
      setMonth((m) => m)
      // Force one explicit refetch since setMonth to same value is a no-op
      const { data } = await supabase!
        .from('driver_rides_log')
        .select('id, ride_date, pickup_label, dropoff_label, pitstop_note, customer_name, customer_phone, service, distance_km, amount_idr, notes, created_at')
        .gte('ride_date', monthBounds(month).start)
        .lt('ride_date',  monthBounds(month).end)
        .order('ride_date', { ascending: false })
        .order('created_at', { ascending: false })
      setRows((data ?? []) as LogRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus ride ini dari logbook?')) return
    try {
      const res = await fetch(`/api/driver-rides-log/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Delete failed')
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  function downloadCsv() {
    if (rows.length === 0) return
    const csv = buildCsv(rows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cityrider-rides-${month}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <>
        <AppNav />
        <main className="max-w-2xl mx-auto px-4 pt-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" />
        </main>
      </>
    )
  }
  if (error && !userId) {
    return (
      <>
        <AppNav />
        <main className="max-w-2xl mx-auto px-4 pt-12 text-center space-y-3">
          <p className="text-red-400">{error}</p>
          <Link href="/dashboard" className="text-brand font-bold">← Dashboard</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <header>
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
              <span className="gradient-text">Operations</span> log
            </h1>
            <p className="text-[13px] text-muted mt-1 leading-snug">
              Your own bookkeeping for NPWP, insurance claims, and operational records.
              City Rider doesn&apos;t track your rides — you do, here.
            </p>
          </header>

          {/* Month selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand shrink-0" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonthIso())}
              className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[13px] font-bold text-ink focus:outline-none focus:border-brand/40"
              aria-label="Select month"
            />
            <button
              type="button"
              onClick={downloadCsv}
              disabled={rows.length === 0}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand/40 text-[12px] font-extrabold uppercase tracking-wider text-brand hover:bg-brand/10 transition disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>

          {/* Month snapshot — totals + reviews + subscription */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Rides logged" value={totals.count.toString()} icon={<Users className="w-3 h-3" />} />
            <Stat label="Earned" value={idr(totals.earnings)} icon={<BadgeCheck className="w-3 h-3" />} />
            <Stat
              label="Reviews"
              value={reviewStats.avg != null
                ? `★ ${reviewStats.avg.toFixed(1)} (${reviewStats.count})`
                : `${reviewStats.count}`}
              icon={<Star className="w-3 h-3" />}
            />
            <Stat
              label="Subscription"
              value={subStatus ? subStatus.status : '—'}
              hint={subStatus?.paid_until ? `until ${subStatus.paid_until.slice(0, 10)}` : undefined}
              icon={<BadgeCheck className="w-3 h-3" />}
            />
          </section>

          {/* Year-to-date tax summary — sums every logged ride in the
              current calendar year and compares against PTKP. If the
              driver crosses Rp 54M (TK0) they're required to register
              NPWP under UU 7/2021. Shows the gap clearly.  */}
          <YtdTaxCard year={month.slice(0, 4)} earnings={ytdEarnings} rides={ytdRides} />

          {/* Logbook */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">
                Logged rides · {totals.count}
              </h2>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[12px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
              >
                <Plus className="w-3.5 h-3.5" />
                Log a ride
              </button>
            </div>

            {rows.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-[13px] text-muted">
                  No rides logged this month yet. Tap <strong className="text-ink">Log a ride</strong> after a completed trip.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id} className="card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-extrabold text-ink">{r.ride_date}</span>
                          {r.service && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand">
                              {r.service}
                            </span>
                          )}
                          {r.distance_km != null && (
                            <span className="text-[11px] text-muted">{r.distance_km} km</span>
                          )}
                        </div>
                        <div className="text-[12px] text-muted truncate mt-0.5">
                          {(r.pickup_label || '—')} → {(r.dropoff_label || '—')}
                        </div>
                        {r.pitstop_note && (
                          <div className="text-[11px] text-dim mt-0.5 italic truncate">
                            🛑 {r.pitstop_note}
                          </div>
                        )}
                        {(r.customer_name || r.customer_phone) && (
                          <div className="text-[11px] text-dim mt-0.5 truncate">
                            {r.customer_name || ''}
                            {r.customer_name && r.customer_phone ? ' · ' : ''}
                            {r.customer_phone || ''}
                          </div>
                        )}
                        {r.notes && (
                          <div className="text-[11px] text-muted mt-1 leading-snug line-clamp-2">
                            {r.notes}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[14px] font-extrabold text-brand">{idr(r.amount_idr)}</div>
                        <div className="mt-1 flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            aria-label="Edit"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-brand hover:bg-white/5 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            aria-label="Delete"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-[11px] text-dim leading-snug">
            City Rider doesn&apos;t auto-record your rides — this log is yours.
            Use the CSV export for NPWP filings, insurance claims, or accountant handoff.
          </p>
        </div>
      </main>

      {/* Add / Edit dialog — simple full-screen card */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md card p-4 space-y-3 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold">
                {editingId ? 'Edit ride' : 'Log a ride'}
              </h3>
              <button
                type="button"
                onClick={() => { setFormOpen(false); setEditingId(null) }}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-white/5"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.ride_date}
                  onChange={(e) => setForm({ ...form, ride_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Service</label>
                <select
                  className="input"
                  value={form.service ?? 'person'}
                  onChange={(e) => setForm({ ...form, service: e.target.value as LogRow['service'] })}
                >
                  <option value="person">Person</option>
                  <option value="parcel">Parcel</option>
                  <option value="food">Food</option>
                  <option value="tour">Tour</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Pickup</label>
              <input
                className="input"
                placeholder="Where you picked up"
                maxLength={200}
                value={form.pickup_label}
                onChange={(e) => setForm({ ...form, pickup_label: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Drop off</label>
              <input
                className="input"
                placeholder="Where you dropped them off"
                maxLength={200}
                value={form.dropoff_label}
                onChange={(e) => setForm({ ...form, dropoff_label: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Pit stop (optional)</label>
              <input
                className="input"
                placeholder="e.g. Marlboro stop on the way"
                maxLength={200}
                value={form.pitstop_note}
                onChange={(e) => setForm({ ...form, pitstop_note: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Distance (km)</label>
                <input
                  className="input font-mono"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.distance_km}
                  onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Earned (Rp)</label>
                <input
                  className="input font-mono"
                  type="text"
                  inputMode="numeric"
                  value={form.amount_idr}
                  onChange={(e) => setForm({ ...form, amount_idr: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Customer name (optional)</label>
                <input
                  className="input"
                  maxLength={80}
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Customer phone (optional)</label>
                <input
                  className="input font-mono"
                  maxLength={30}
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                className="input min-h-[60px]"
                rows={2}
                maxLength={600}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {error && (
              <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Plus className="w-4 h-4" /> {editingId ? 'Update ride' : 'Save ride'}</>}
            </button>
          </form>
        </div>
      )}
    </>
  )
}

// YtdTaxCard — running total of logged earnings for the calendar
// year vs the PTKP single-status threshold (Rp 54M, TK0). Tells the
// driver whether they are below, near, or above the NPWP-registration
// threshold under UU 7/2021. Driver self-declares; we only sum the
// log they entered.
function YtdTaxCard({ year, earnings, rides }: { year: string; earnings: number; rides: number }) {
  const PTKP_TK0 = 54_000_000  // single-status threshold, Rupiah per year
  const pct      = Math.min(100, Math.round((earnings / PTKP_TK0) * 100))
  const crossed  = earnings >= PTKP_TK0
  const near     = !crossed && earnings >= 0.8 * PTKP_TK0
  const toneColor =
    crossed ? '#EF4444' :
    near    ? '#F97316' :
              '#22C55E'

  return (
    <section
      className="rounded-2xl p-4 border"
      style={{
        background: 'rgba(10,10,10,0.45)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-dim">
            YTD {year} · sole-proprietor income
          </div>
          <div className="text-[20px] font-extrabold mt-0.5 leading-none">
            {idr(earnings)}{' '}
            <span className="text-[12px] font-bold text-muted">
              · {rides} ride{rides === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div
          className="px-2 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider"
          style={{
            color: toneColor,
            background: `${toneColor}1A`,
            border: `1px solid ${toneColor}55`,
          }}
        >
          {crossed ? 'NPWP required' : near ? 'NPWP soon' : 'Below PTKP'}
        </div>
      </div>

      {/* PTKP progress bar */}
      <div className="mt-3 h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: toneColor }}
        />
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <span className="text-[11px] text-dim">PTKP TK0 · Rp 54.000.000</span>
        <span className="text-[11px] font-bold" style={{ color: toneColor }}>{pct}%</span>
      </div>

      {crossed && (
        <div className="mt-3 text-[12px] leading-snug" style={{ color: '#FCA5A5' }}>
          You&apos;ve crossed PTKP for {year}. Under UU 7/2021 (HPP) you must register an
          NPWP and file PPh annually. The UMKM final-tax option (PPh Final 0.5%) is the
          simplest path — applies to gross income, no deductions.{' '}
          <a href="https://www.pajak.go.id" target="_blank" rel="noopener noreferrer" className="text-brand font-bold underline">
            pajak.go.id →
          </a>
        </div>
      )}
      {near && (
        <div className="mt-3 text-[12px] leading-snug" style={{ color: '#FED7AA' }}>
          You&apos;re close to the PTKP threshold. If you cross Rp 54.000.000 this year you&apos;ll
          need an NPWP. Consider registering early — it&apos;s free and takes ~30 min online.
        </div>
      )}
      {!crossed && !near && (
        <p className="mt-3 text-[12px] text-muted leading-snug">
          PTKP shown for single status (TK0). Married = Rp 58.500.000 (K0). NPWP only required
          when you exceed your applicable PTKP.
        </p>
      )}
    </section>
  )
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-1">
        {icon}
        <span className="text-brand">{label}</span>
      </div>
      <div className="text-[16px] font-extrabold mt-1 leading-none">{value}</div>
      {hint && <div className="text-[11px] text-dim mt-1">{hint}</div>}
    </div>
  )
}
