'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, MessageCircle, Check, X as XIcon, Ban, BadgeCheck, Sparkles, Clock, Plus } from 'lucide-react'
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

// mig 0134 — partial-day busy ranges
type BusyTimeSlot = {
  date:       string  // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time:   string  // HH:MM
}

export default function BeauticianBookingsPage() {
  const [bookings,       setBookings]       = useState<Booking[]>([])
  const [busyDates,      setBusyDates]      = useState<string[]>([])
  const [busyTimeSlots,  setBusyTimeSlots]  = useState<BusyTimeSlot[]>([])
  const [loading,        setLoading]        = useState(true)
  const [err,            setErr]            = useState<string | null>(null)
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
      const j = await r.json() as { bookings: Booking[]; busy_dates: string[]; busy_time_slots?: BusyTimeSlot[] }
      setBookings(j.bookings ?? [])
      setBusyDates(j.busy_dates ?? [])
      setBusyTimeSlots(j.busy_time_slots ?? [])
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
  // mig 0134 — partial-busy slots for the selected day
  const selectedTimeSlots = useMemo(
    () => busyTimeSlots
      .filter((s) => s.date === selected)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [busyTimeSlots, selected],
  )
  // Calendar marker — set of dates with at least one partial-busy slot.
  const partialBusySet = useMemo(
    () => new Set(busyTimeSlots.map((s) => s.date)),
    [busyTimeSlots],
  )

  async function addTimeSlot(date: string, start_time: string, end_time: string) {
    if (!start_time || !end_time || end_time <= start_time) return
    const slot = { date, start_time, end_time }
    const prev = busyTimeSlots
    setBusyTimeSlots((cur) => {
      const k = `${slot.date}|${slot.start_time}|${slot.end_time}`
      if (cur.some((s) => `${s.date}|${s.start_time}|${s.end_time}` === k)) return cur
      return [...cur, slot].sort((a, b) =>
        (`${a.date}|${a.start_time}|${a.end_time}`).localeCompare(`${b.date}|${b.start_time}|${b.end_time}`),
      )
    })
    try {
      const r = await fetch('/api/beautician/me/busy-time-slots', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ add: slot }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) { setBusyTimeSlots(prev); return }
      if (Array.isArray(j.busy_time_slots)) setBusyTimeSlots(j.busy_time_slots)
    } catch { setBusyTimeSlots(prev) }
  }

  async function removeTimeSlot(slot: BusyTimeSlot) {
    const prev = busyTimeSlots
    setBusyTimeSlots((cur) => cur.filter((s) =>
      !(s.date === slot.date && s.start_time === slot.start_time && s.end_time === slot.end_time),
    ))
    try {
      const r = await fetch('/api/beautician/me/busy-time-slots', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ remove: slot }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) { setBusyTimeSlots(prev); return }
      if (Array.isArray(j.busy_time_slots)) setBusyTimeSlots(j.busy_time_slots)
    } catch { setBusyTimeSlots(prev) }
  }

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
          <Link href="/login?next=/dashboard/beautician/bookings" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-4 pb-28 max-w-lg mx-auto">
        {/* Brand header — matches the Design Studio pattern on /edit. */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <CalIcon size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Bookings & calendar</h1>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Tap a date to see requests for that day, or to mark yourself busy.
              </p>
            </div>
          </div>
        </div>

        {/* Calendar card */}
        <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-4 space-y-3">
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
            partialBusyDates={partialBusySet}
            bookingsByDate={bookingsByDate}
            onSelect={setSelected}
          />
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <Legend />
            <button
              type="button"
              onClick={() => toggleBusy(selected)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-extrabold uppercase tracking-wider transition active:scale-[0.97] min-h-[40px] ${
                isSelectedBusy
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-pink-500 text-white shadow shadow-pink-500/25'
              }`}
            >
              <Ban size={14} />
              {isSelectedBusy ? 'Unmark busy' : 'Mark busy'}
            </button>
          </div>
        </section>

        {/* Partial busy time ranges — only meaningful when the whole day
            isn't busy. Owner can block specific hours so they keep
            accepting bookings outside those hours. */}
        {!isSelectedBusy && (
          <BusyTimeSlotsEditor
            date={selected}
            slots={selectedTimeSlots}
            onAdd={addTimeSlot}
            onRemove={removeTimeSlot}
          />
        )}

        {/* Selected-day detail */}
        <section className="mt-4 rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-pink-50 border-b border-pink-200/70 px-4 py-3">
            <div className="text-[12px] uppercase tracking-wider font-bold text-pink-700">
              {prettyDate(selected)}
            </div>
            <div className="text-[14px] font-extrabold text-black">
              {selectedBookings.length === 0
                ? (isSelectedBusy ? 'You marked this day busy.' : 'No bookings for this day.')
                : `${selectedBookings.length} booking${selectedBookings.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <div className="bg-white p-3 space-y-2">
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
        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-black transition active:scale-[0.95]"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-[15px] font-black text-black">{label}</div>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next month"
        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-black transition active:scale-[0.95]"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function CalendarGrid({
  viewMonth, today, selected, busyDates, partialBusyDates, bookingsByDate, onSelect,
}: {
  viewMonth: string
  today: string
  selected: string
  busyDates: string[]
  partialBusyDates: Set<string>
  bookingsByDate: Record<string, { status: string }[]>
  onSelect: (iso: string) => void
}) {
  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth])
  const busySet = useMemo(() => new Set(busyDates), [busyDates])
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[12px] font-bold text-black/45 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const inMonth      = c.inMonth
          const iso          = c.iso
          const isToday      = iso === today
          const isSel        = iso === selected
          const isBusy       = busySet.has(iso)
          const isPartBusy   = !isBusy && partialBusyDates.has(iso)
          const dayList      = bookingsByDate[iso] ?? []
          const hasPending   = dayList.some((b) => b.status === 'pending')
          const hasConfirm   = dayList.some((b) => b.status === 'confirmed')

          let bg = 'bg-transparent'
          let text = inMonth ? 'text-black' : 'text-black/25'
          let ring = ''
          if (isSel)          { bg = 'bg-pink-500'; text = 'text-white' }
          else if (isBusy)    { bg = 'bg-red-100';  text = 'text-red-700' }
          else if (isPartBusy){ bg = 'bg-amber-50'; text = 'text-amber-800' }
          else if (isToday)   { ring = 'ring-2 ring-pink-300' }

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              disabled={!inMonth}
              className={`relative aspect-square rounded-lg ${bg} ${text} ${ring} text-[13px] font-bold flex items-center justify-center transition active:scale-[0.94] ${inMonth && !isSel && !isBusy && !isPartBusy ? 'hover:bg-gray-100' : ''}`}
            >
              {c.day}
              {dayList.length > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                    hasPending ? 'bg-amber-500' : hasConfirm ? 'bg-emerald-500' : 'bg-gray-400'
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

// ─────────────────────────────────────────────────────────────────────────
// Partial-busy editor (mig 0134) — owner picks start/end time within a
// single date; the public booking widget hides any time options that
// overlap a slot. Only renders when the whole day isn't already busy.
// ─────────────────────────────────────────────────────────────────────────

function BusyTimeSlotsEditor({
  date, slots, onAdd, onRemove,
}: {
  date:   string
  slots:  BusyTimeSlot[]
  onAdd:    (date: string, start: string, end: string) => void
  onRemove: (slot: BusyTimeSlot) => void
}) {
  const [start, setStart] = useState('')
  const [end,   setEnd]   = useState('')
  const valid = !!start && !!end && end > start

  return (
    <section className="mt-4 rounded-3xl bg-white border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Clock size={16} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-black">Busy time ranges</h2>
          <p className="text-[12px] text-black/55 leading-snug">
            Block specific hours on this day. Customers can still book outside these hours.
          </p>
        </div>
      </div>

      {slots.length > 0 && (
        <div className="space-y-1.5">
          {slots.map((s) => (
            <div
              key={`${s.start_time}-${s.end_time}`}
              className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2"
            >
              <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-amber-800">
                <Ban size={14} strokeWidth={2.5} />
                {s.start_time} – {s.end_time}
              </span>
              <button
                type="button"
                onClick={() => onRemove(s)}
                aria-label={`Remove busy ${s.start_time}-${s.end_time}`}
                className="w-8 h-8 rounded-full bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 flex items-center justify-center transition active:scale-[0.95]"
              >
                <XIcon size={14} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <label className="flex-1 block">
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/55 mb-1 inline-block">Start</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[14px] font-bold text-black focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          />
        </label>
        <label className="flex-1 block">
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/55 mb-1 inline-block">End</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[14px] font-bold text-black focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          />
        </label>
        <button
          type="button"
          onClick={() => { if (valid) { onAdd(date, start, end); setStart(''); setEnd('') } }}
          disabled={!valid}
          className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-pink-500 text-white text-[12px] font-extrabold uppercase tracking-wider shadow shadow-pink-500/25 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] transition"
        >
          <Plus size={14} strokeWidth={3} />
          Add
        </button>
      </div>
      {start && end && end <= start && (
        <p className="text-[12px] text-amber-700">End time must be later than start.</p>
      )}
    </section>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[12px] text-black/55 flex-wrap">
      <span className="inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Confirmed
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200" /> Busy
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200" /> Partial
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
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-[14px] font-black text-black truncate">{booking.customer_name}</div>
            <StatusPill status={booking.status} />
          </div>
          <div className="text-[12px] text-black/60 mt-0.5 font-mono">
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
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 text-[12px] font-extrabold min-h-[40px] flex-1 transition"
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
              className="w-10 h-10 rounded-lg bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center transition active:scale-[0.95]"
            >
              <Check size={16} strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => onStatus(booking.id, 'declined')}
              aria-label="Decline"
              className="w-10 h-10 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center justify-center transition active:scale-[0.95]"
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
            className="w-10 h-10 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition active:scale-[0.95]"
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
    pending:   { label: 'Pending',   c: 'bg-amber-50    text-amber-700   border-amber-200' },
    confirmed: { label: 'Confirmed', c: 'bg-emerald-50  text-emerald-700 border-emerald-200' },
    declined:  { label: 'Declined',  c: 'bg-red-50      text-red-700     border-red-200' },
    completed: { label: 'Done',      c: 'bg-stone-100   text-stone-700   border-stone-200' },
    cancelled: { label: 'Cancelled', c: 'bg-stone-100   text-stone-600   border-stone-200' },
  } as const
  const m = map[status]
  return (
    <span className={`inline-flex items-center text-[12px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${m.c}`}>
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
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
