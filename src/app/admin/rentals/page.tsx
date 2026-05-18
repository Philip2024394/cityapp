import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import RentalRowActions from './RentalRowActions'
import { idr } from '@/lib/format/idr'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'unpaid'

type RentalAdminRow = {
  id: string
  slug: string
  owner_name: string
  owner_company: string | null
  owner_whatsapp_e164: string
  brand: string
  model: string
  year: number
  cc: number
  transmission: 'automatic' | 'manual' | 'semi_auto'
  color: string | null
  daily_price_idr: number
  weekly_price_idr: number | null
  monthly_price_idr: number | null
  security_deposit_idr: number | null
  driver_rate_per_day_idr: number | null
  helmet_count: number
  raincoat_count: number
  has_phone_holder: boolean
  has_phone_charger: boolean
  has_delivery_box: boolean
  ready_to_work: boolean
  delivers_to_hotel: boolean
  delivers_to_villa: boolean
  pickup_dropoff: boolean
  rental_mode: 'self_ride' | 'with_driver' | 'both'
  city: string
  address: string | null
  lat: number
  lng: number
  image_urls: string[] | null
  description: string | null
  tags: string[] | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  verified: boolean
  listing_tier: 'free' | 'paid' | 'featured'
  paid_until: string | null
  rejection_note: string | null
  submitted_name: string | null
  submitted_email: string | null
  submitted_whatsapp: string | null
  created_at: string
}

export default async function AdminRentals({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const sp = await searchParams
  const filter = (sp?.filter ?? 'pending') as Filter

  const { data: rows } = await admin
    .from('bike_rentals')
    .select(
      'id, slug, owner_name, owner_company, owner_whatsapp_e164, brand, model, year, cc, transmission, color, ' +
      'daily_price_idr, weekly_price_idr, monthly_price_idr, security_deposit_idr, driver_rate_per_day_idr, ' +
      'helmet_count, raincoat_count, has_phone_holder, has_phone_charger, has_delivery_box, ready_to_work, ' +
      'delivers_to_hotel, delivers_to_villa, pickup_dropoff, rental_mode, ' +
      'city, address, lat, lng, image_urls, description, tags, ' +
      'status, verified, listing_tier, paid_until, rejection_note, ' +
      'submitted_name, submitted_email, submitted_whatsapp, created_at',
    )
    .order('created_at', { ascending: false })

  const all = (rows as RentalAdminRow[] | null) ?? []
  const list = all.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'unpaid') return r.status === 'approved' && !r.paid_until
    return r.status === filter
  })

  const counts = {
    pending:   all.filter((r) => r.status === 'pending').length,
    approved:  all.filter((r) => r.status === 'approved').length,
    rejected:  all.filter((r) => r.status === 'rejected').length,
    suspended: all.filter((r) => r.status === 'suspended').length,
    unpaid:    all.filter((r) => r.status === 'approved' && !r.paid_until).length,
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">Rentals</h1>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          <FilterPill filter="pending"   active={filter === 'pending'}   count={counts.pending} />
          <FilterPill filter="approved"  active={filter === 'approved'}  count={counts.approved} />
          <FilterPill filter="unpaid"    active={filter === 'unpaid'}    count={counts.unpaid} />
          <FilterPill filter="rejected"  active={filter === 'rejected'}  count={counts.rejected} />
          <FilterPill filter="suspended" active={filter === 'suspended'} count={counts.suspended} />
          <FilterPill filter="all"       active={filter === 'all'}       count={all.length} />
        </div>
      </header>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          No rentals match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => <AdminRentalCard key={r.id} rental={r} />)}
        </div>
      )}
    </div>
  )
}

function FilterPill({ filter, active, count }: { filter: Filter; active: boolean; count: number }) {
  return (
    <Link
      href={filter === 'all' ? '/admin/rentals' : `/admin/rentals?filter=${filter}`}
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border whitespace-nowrap transition"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)',
      }}
    >
      <span className="capitalize">{filter}</span>
      <span
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold"
        style={{
          background: active ? 'rgba(10,10,10,0.20)' : 'rgba(250,204,21,0.20)',
          color: active ? '#0A0A0A' : '#FACC15',
        }}
      >
        {count}
      </span>
    </Link>
  )
}

function AdminRentalCard({ rental: r }: { rental: RentalAdminRow }) {
  const photo = r.image_urls?.[0]
  const created = new Date(r.created_at).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  const paidUntil = r.paid_until ? new Date(r.paid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null

  return (
    <div className="card p-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10">
          {photo
            ? <img src={photo} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted uppercase tracking-wider">No photo</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-extrabold text-ink leading-tight truncate">
                {r.brand} {r.model}
              </h3>
              <div className="mt-0.5 text-[12px] text-muted truncate">
                <span className="text-brand font-bold">{r.year} · {r.cc}cc · {r.transmission}</span>
                <span className="mx-1.5 text-dim">·</span>
                <span className="capitalize">{r.rental_mode.replace('_', ' ')}</span>
                <span className="mx-1.5 text-dim">·</span>
                <span className="capitalize">{r.city}</span>
              </div>
            </div>
            <StatusBadge status={r.status} />
          </div>

          {/* Owner contact */}
          {(r.submitted_name || r.submitted_email || r.submitted_whatsapp || r.owner_company) && (
            <div className="mt-2 p-2 rounded-lg bg-black/40 border border-white/5 text-[12px]">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim mb-1">Owner</div>
              <div className="space-y-0.5">
                {r.owner_company && <div><span className="text-dim">Company:</span> {r.owner_company}</div>}
                {(r.submitted_name || r.owner_name) && <div><span className="text-dim">Name:</span> {r.submitted_name ?? r.owner_name}</div>}
                {(r.submitted_whatsapp || r.owner_whatsapp_e164) && (
                  <div>
                    <span className="text-dim">WA:</span>{' '}
                    <a
                      href={`https://wa.me/${(r.submitted_whatsapp ?? r.owner_whatsapp_e164).replace(/[^\d]/g, '')}`}
                      target="_blank" rel="noopener noreferrer" className="text-brand hover:underline"
                    >
                      {r.submitted_whatsapp ?? r.owner_whatsapp_e164}
                    </a>
                  </div>
                )}
                {r.submitted_email && (
                  <div><span className="text-dim">Email:</span> <a href={`mailto:${r.submitted_email}`} className="text-brand hover:underline">{r.submitted_email}</a></div>
                )}
              </div>
            </div>
          )}

          {/* Pricing summary */}
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="px-1.5 py-0.5 rounded font-extrabold tabular-nums" style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15' }}>
              {idr(r.daily_price_idr)} / day
            </span>
            {r.weekly_price_idr  && <span className="px-1.5 py-0.5 rounded text-muted bg-white/5">{idr(r.weekly_price_idr)} / wk</span>}
            {r.monthly_price_idr && <span className="px-1.5 py-0.5 rounded text-muted bg-white/5">{idr(r.monthly_price_idr)} / mo</span>}
            {r.security_deposit_idr && <span className="px-1.5 py-0.5 rounded text-muted bg-white/5">Deposit {idr(r.security_deposit_idr)}</span>}
            {r.driver_rate_per_day_idr && <span className="px-1.5 py-0.5 rounded text-muted bg-white/5">+ driver {idr(r.driver_rate_per_day_idr)} / day</span>}
          </div>

          {/* Inclusions */}
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-muted">
            {r.helmet_count   > 0 && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Helmet ×{r.helmet_count}</span>}
            {r.raincoat_count > 0 && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Raincoat ×{r.raincoat_count}</span>}
            {r.has_phone_holder  && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Holder</span>}
            {r.has_phone_charger && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Charger</span>}
            {r.has_delivery_box  && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Box</span>}
            {r.ready_to_work     && <span className="px-1.5 py-0.5 rounded font-extrabold" style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15' }}>Ready to work</span>}
            {r.delivers_to_hotel && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Hotel delivery</span>}
            {r.pickup_dropoff    && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Pickup/drop-off</span>}
          </div>

          {/* Tier + payment + verified + meta */}
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
              {r.listing_tier}
            </span>
            {paidUntil
              ? <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Paid · until {paidUntil}</span>
              : <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>Unpaid</span>}
            {r.verified && <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15' }}>Verified</span>}
            <span className="ml-auto text-dim font-mono">{created}</span>
          </div>

          {r.rejection_note && (
            <div className="mt-2 text-[12px] text-red-300 bg-red-900/20 border border-red-500/20 rounded p-2">
              <strong>Rejected:</strong> {r.rejection_note}
            </div>
          )}

          {/* Image thumbnail strip if multiple photos */}
          {(r.image_urls?.length ?? 0) > 1 && (
            <div className="mt-2 flex items-center gap-1 overflow-x-auto">
              {r.image_urls!.slice(1).map((u) => (
                <img key={u} src={u} alt="" className="w-12 h-12 rounded-md object-cover shrink-0 border border-white/10" />
              ))}
            </div>
          )}

          <div className="mt-3">
            <RentalRowActions rentalId={r.id} status={r.status} hasPaid={!!r.paid_until} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: RentalAdminRow['status'] }) {
  const styles: Record<RentalAdminRow['status'], { bg: string; fg: string }> = {
    pending:   { bg: 'rgba(250,204,21,0.15)', fg: '#FACC15' },
    approved:  { bg: 'rgba(34,197,94,0.15)',  fg: '#22C55E' },
    rejected:  { bg: 'rgba(239,68,68,0.15)',  fg: '#EF4444' },
    suspended: { bg: 'rgba(148,163,184,0.18)',fg: '#94A3B8' },
  }
  const s = styles[status]
  return (
    <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider" style={{ background: s.bg, color: s.fg }}>
      {status}
    </span>
  )
}
