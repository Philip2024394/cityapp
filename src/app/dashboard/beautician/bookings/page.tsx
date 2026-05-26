'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, MessageCircle, Check, X as XIcon, Ban, BadgeCheck } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

// Booking dashboard — month calendar where the beautician taps a date to:
//   • Toggle that date as Busy (greyed out for customers in the public picker)
//   • See every booking request submitted for that date (name + WA + service
//     + status) so she can confirm or decline.
// Dates are rendered in the beautician's local timezone. Busy dates and
// booking rows are stored as ISO YYYY-MM-DD strings — no timezone math
// when displaying.


type Booking = {
  id:                 string
  customer_name:      string
  customer_whatsapp:  string
  service_name:       string | null
  requested_date:     string  // YYYY-MM-DD
  requested_time:     string  // HH:MM
  status:             'pending' | 'confirmed' | 'declined' | 'completed' | 'cancelled'
  notes:              string | null
  created_at:         string
  updated_at:         string
}

export default function BeauticianBookingsPage() {
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [busyDates,  setBusyDates]  = useState<string[]>([])
  const [loading,    setLoading]    = useState(true)
  const [err,        setErr]        = useState<string | null>(null)
  // YYYY-MM-DD of the day currently selected in the calendar.
  const today = isoDate(new Date())
  const [selected,   setSelected]   = useState<string>(today)
  // Month being viewed (first-of-month date string).
  const [viewMonth,  setViewMonth]  = useState<string>(firstOfMonthIso(new Date()))

  const reload = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/beautician/me/bookings', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      if (!r.ok)            { setErr('fetch_failed');  return }
      const j = await r.json() as { bookings: Booking[]; busy_dates: string[] }
      setBookings(j.bookings ?? [])
      setBusyDates(j.busy_dates ?? [])
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  // Group bookings by date for fast dot rendering on calendar tiles.
  const bookingsByDate = useMemo(() => {
    const out: Record<string, Booking[]> = {}
    for (const b of bookings) {
      (out[b.requested_date] ||= []).push(b)
    }
    return out
  }, [bookings])

  const selectedBookings = bookingsByDate[selected] ?? []
  const isSelectedBusy   = busyDates.includes(selected)

  async function toggleBusy(date: string) {
    const op  = busyDates.includes(date) ? { remove: date } : { add: date }
    // Optimistic update so the calendar feels instant.
    setBusyDates((prev) => op.add
      ? Array.from(new Set([...prev, date])).sort()
      : prev.filter((d) => d !== date))
    try {
      const r = await fetch('/api/beautician/me/busy-dates', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(op),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) {
        // Roll back on failure.
        await reload()
      } else if (Array.isArray(j.busy_dates)) {
        setBusyDates(j.busy_dates)
      }
    } catch { await reload() }
  }

  async function updateStatus(id: string, status: Booking['status']) {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
    try {
      const r = await fetch(`/api/beautician/me/bookings/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      if (!r.ok) await reload()
    } catch { await reload() }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-black/70 text-[14px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician/bookings" className="rounded-full bg-yellow-400 text-yellow-900 px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-3 pb-28 max-w-lg mx-auto">
        <header className="mb-5 flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-yellow-400 text-yellow-900 shadow-md shadow-yellow-400/20">
            <CalIcon size={18} />
          </div>
          <div>
            <h1 className="text-[24px] font-black text-black leading-tight">Bookings & calendar</h1>
            <p className="text-[13px] text-black/70 mt-1">
              Tap a date to see requests for that day, or to mark yourself busy.
            </p>
          </div>
        </header>

        {/* Calendar card */}
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 shadow-lg shadow-black/20 space-y-3">
          <CalendarHeader
            viewMonth={viewMonth}
            onPrev={() => setViewMonth(addMonths(viewMonth, -1))}
            onNext={() => setViewMonth(addMonths(viewMonth,  1))}
          />
          <CalendarGrid
            viewMonth={viewMonth}
            today={today}
            selected={selected}
            busyDates={busyDates}
            bookingsByDate={bookingsByDate}
            onSelect={setSelected}
          />
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <Legend />
            <button
              type="button"
              onClick={() => toggleBusy(selected)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-extrabold uppercase tracking-wider transition active:scale-[0.97] ${
                isSelectedBusy
                  ? 'bg-red-500/25 text-red-200 border border-red-400/40'
                  : 'bg-yellow-400 text-yellow-900 shadow shadow-yellow-400/30'
              }`}
            >
              <Ban size={14} />
              {isSelectedBusy ? 'Unmark busy' : 'Mark busy'}
            </button>
          </div>
        </section>

        {/* Selected-day detail */}
        <section className="mt-4 rounded-2xl border border-white/10 shadow-lg shadow-black/20 overflow-hidden">
          <div className="bg-red-500/85 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-red-50/85">
              {prettyDate(selected)}
            </div>
            <div className="text-[14px] font-extrabold text-black">
              {selectedBookings.length === 0
                ? (isSelectedBusy ? 'You marked this day busy.' : 'No bookings for this day.')
                : `${selectedBookings.length} booking${selectedBookings.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <div className="bg-black/65 backdrop-blur-md p-3 space-y-2">
            {selectedBookings.length === 0 ? (
              <p className="text-[13px] text-black/65 leading-snug px-1 py-3">
                When a customer submits a booking from your public profile, their
                name, WhatsApp number, and the service they want appear here so
                you know who to expect.
              </p>
            ) : (
              selectedBookings
                .slice()
                .sort((a, b) => a.requested_time.localeCompare(b.requested_time))
                .map((b) => (
                  <BookingRow key={b.id} booking={b} onStatus={updateStatus} />
                ))
            )}
          </div>
        </section>
      </div>
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Calendar
// ─────────────────────────────────────────────────────────────────────────

function CalendarHeader({ viewMonth, onPrev, onNext }: {
  viewMonth: string; onPrev: () => void; onNext: () => void
}) {
  const d = new Date(viewMonth + 'T00:00:00')
  const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-black/85"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-[15px] font-black text-black">{label}</div>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next month"
        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-black/85"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function CalendarGrid({
  viewMonth, today, selected, busyDates, bookingsByDate, onSelect,
}: {
  viewMonth: string
  today: string
  selected: string
  busyDates: string[]
  bookingsByDate: Record<string, { status: string }[]>
  onSelect: (iso: string) => void
}) {
  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth])
  const busySet = useMemo(() => new Set(busyDates), [busyDates])
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[10px] font-bold text-white/45 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const inMonth   = c.inMonth
          const iso       = c.iso
          const isToday   = iso === today
          const isSel     = iso === selected
          const isBusy    = busySet.has(iso)
          const dayList   = bookingsByDate[iso] ?? []
          const hasPending  = dayList.some((b) => b.status === 'pending')
          const hasConfirm  = dayList.some((b) => b.status === 'confirmed')

          let bg = 'bg-transparent'
          let text = inMonth ? 'text-black/85' : 'text-white/30'
          let ring = ''
          if (isSel)       { bg = 'bg-yellow-400'; text = 'text-yellow-900' }
          else if (isBusy) { bg = 'bg-red-500/30'; text = 'text-red-100' }
          else if (isToday){ ring = 'ring-1 ring-yellow-400/70' }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              disabled={!inMonth}
              className={`relative aspect-square rounded-lg ${bg} ${text} ${ring} text-[12px] font-bold flex items-center justify-center transition active:scale-[0.94] ${inMonth ? 'hover:bg-white/10' : ''}`}
            >
              {c.day}
              {dayList.length > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                    hasPending ? 'bg-amber-300' : hasConfirm ? 'bg-emerald-300' : 'bg-white/70'
                  }`}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-black/55">
      <span className="inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300" /> Pending
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> Confirmed
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded bg-red-500/40 border border-red-400/40" /> Busy
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Booking row + status actions
// ─────────────────────────────────────────────────────────────────────────

function BookingRow({
  booking, onStatus,
}: {
  booking: Booking
  onStatus: (id: string, status: Booking['status']) => void
}) {
  const waLink = `https://wa.me/${booking.customer_whatsapp.replace(/[^\d]/g, '')}`
  return (
    <div className="rounded-xl bg-gray-100 border border-gray-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-[14px] font-black text-black truncate">{booking.customer_name}</div>
            <StatusPill status={booking.status} />
          </div>
          <div className="text-[11px] text-white/60 mt-0.5 font-mono">
            {booking.requested_time} · {booking.service_name || 'No service specified'}
          </div>
        </div>
      </div>
      {booking.notes && (
        <p className="text-[12px] text-black/70 leading-snug whitespace-pre-wrap">
          {booking.notes}
        </p>
      )}
      <div className="flex items-center gap-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/85 hover:bg-emerald-500 text-white px-3 py-2 text-[12px] font-extrabold min-h-[36px] flex-1"
        >
          <MessageCircle size={14} />
          {booking.customer_whatsapp}
        </a>
        {booking.status === 'pending' && (
          <>
            <button
              type="button"
              onClick={() => onStatus(booking.id, 'confirmed')}
              aria-label="Confirm"
              className="w-9 h-9 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-yellow-900 flex items-center justify-center"
            >
              <Check size={16} strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => onStatus(booking.id, 'declined')}
              aria-label="Decline"
              className="w-9 h-9 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-100 flex items-center justify-center"
            >
              <XIcon size={16} strokeWidth={3} />
            </button>
          </>
        )}
        {booking.status === 'confirmed' && (
          <button
            type="button"
            onClick={() => onStatus(booking.id, 'completed')}
            aria-label="Mark completed"
            className="w-9 h-9 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-100 flex items-center justify-center"
            title="Mark completed"
          >
            <BadgeCheck size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const map = {
    pending:   { label: 'Pending',   c: 'bg-amber-500/25   text-amber-200   border-amber-400/40' },
    confirmed: { label: 'Confirmed', c: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40' },
    declined:  { label: 'Declined',  c: 'bg-red-500/25     text-red-200     border-red-400/40' },
    completed: { label: 'Done',      c: 'bg-stone-500/25   text-stone-100   border-stone-400/40' },
    cancelled: { label: 'Cancelled', c: 'bg-stone-500/25   text-stone-200   border-stone-400/40' },
  } as const
  const m = map[status]
  return (
    <span className={`inline-flex items-center text-[9.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${m.c}`}>
      {m.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Date helpers — all dates stored / displayed as YYYY-MM-DD in local time.
// ─────────────────────────────────────────────────────────────────────────

function pad(n: number): string { return n.toString().padStart(2, '0') }
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function firstOfMonthIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}
function addMonths(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + delta)
  return firstOfMonthIso(d)
}
function prettyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function buildMonthCells(viewMonth: string): Array<{ iso: string; day: number; inMonth: boolean }> {
  const start  = new Date(viewMonth + 'T00:00:00')
  const first  = start.getDay()  // 0 = Sun
  const total  = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  // Leading days from previous month
  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = []
  const prevTotal = new Date(start.getFullYear(), start.getMonth(), 0).getDate()
  for (let i = first - 1; i >= 0; i--) {
    const day = prevTotal - i
    const d = new Date(start.getFullYear(), start.getMonth() - 1, day)
    cells.push({ iso: isoDate(d), day, inMonth: false })
  }
  for (let day = 1; day <= total; day++) {
    const d = new Date(start.getFullYear(), start.getMonth(), day)
    cells.push({ iso: isoDate(d), day, inMonth: true })
  }
  // Trailing days to fill 6 rows × 7 = 42 cells.
  while (cells.length < 42) {
    const last = cells[cells.length - 1]
    const lastD = new Date(last.iso + 'T00:00:00')
    lastD.setDate(lastD.getDate() + 1)
    cells.push({ iso: isoDate(lastD), day: lastD.getDate(), inMonth: lastD.getMonth() === start.getMonth() })
  }
  return cells
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
