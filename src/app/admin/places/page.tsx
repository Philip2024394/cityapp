import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import PlaceRowActions from './PlaceRowActions'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'unpaid'

type PlaceRow = {
  id: string
  slug: string
  name: string
  category: string
  city: string
  address: string | null
  description: string | null
  image_urls: string[] | null
  lat: number
  lng: number
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  verified: boolean
  listing_tier: 'free' | 'paid' | 'featured'
  paid_until: string | null
  rejection_note: string | null
  submitted_name: string | null
  submitted_email: string | null
  submitted_whatsapp: string | null
  whatsapp_e164: string | null
  tags: string[] | null
  created_at: string
}

export default async function AdminPlaces({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) {
    return <p className="text-muted text-[14px]">Server not configured.</p>
  }

  const sp = await searchParams
  const filter = (sp?.filter ?? 'pending') as Filter

  const { data: rows } = await admin
    .from('places')
    .select(
      'id, slug, name, category, city, address, description, image_urls, lat, lng, ' +
      'status, verified, listing_tier, paid_until, rejection_note, ' +
      'submitted_name, submitted_email, submitted_whatsapp, whatsapp_e164, tags, created_at',
    )
    .order('created_at', { ascending: false })

  const list = ((rows as PlaceRow[] | null) ?? []).filter((p) => {
    if (filter === 'all') return true
    if (filter === 'unpaid') return p.status === 'approved' && !p.paid_until
    return p.status === filter
  })

  const counts = {
    pending:  ((rows as PlaceRow[] | null) ?? []).filter((p) => p.status === 'pending').length,
    approved: ((rows as PlaceRow[] | null) ?? []).filter((p) => p.status === 'approved').length,
    rejected: ((rows as PlaceRow[] | null) ?? []).filter((p) => p.status === 'rejected').length,
    suspended:((rows as PlaceRow[] | null) ?? []).filter((p) => p.status === 'suspended').length,
    unpaid:   ((rows as PlaceRow[] | null) ?? []).filter((p) => p.status === 'approved' && !p.paid_until).length,
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">Places</h1>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          <FilterPill filter="pending"   active={filter === 'pending'}   count={counts.pending} />
          <FilterPill filter="approved"  active={filter === 'approved'}  count={counts.approved} />
          <FilterPill filter="unpaid"    active={filter === 'unpaid'}    count={counts.unpaid} />
          <FilterPill filter="rejected"  active={filter === 'rejected'}  count={counts.rejected} />
          <FilterPill filter="suspended" active={filter === 'suspended'} count={counts.suspended} />
          <FilterPill filter="all"       active={filter === 'all'}       count={(rows as PlaceRow[] | null)?.length ?? 0} />
        </div>
      </header>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          No places match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <AdminPlaceCard key={p.id} place={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterPill({ filter, active, count }: { filter: Filter; active: boolean; count: number }) {
  return (
    <Link
      href={filter === 'all' ? '/admin/places' : `/admin/places?filter=${filter}`}
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

function AdminPlaceCard({ place: p }: { place: PlaceRow }) {
  const photo = p.image_urls?.[0]
  const created = new Date(p.created_at).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  const paidUntil = p.paid_until ? new Date(p.paid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null

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
              <h3 className="text-[15px] font-extrabold text-ink leading-tight truncate">{p.name}</h3>
              <div className="mt-0.5 text-[12px] text-muted truncate">
                <span className="text-brand font-bold">{p.category}</span>
                <span className="mx-1.5 text-dim">·</span>
                <span className="capitalize">{p.city}</span>
                <span className="mx-1.5 text-dim">·</span>
                <span className="font-mono">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>
              </div>
            </div>
            <StatusBadge status={p.status} />
          </div>

          {(p.address || p.description) && (
            <div className="mt-2 text-[12px] text-muted leading-snug">
              {p.address && <div><strong className="text-dim">Address:</strong> {p.address}</div>}
              {p.description && <div className="mt-0.5"><strong className="text-dim">Desc:</strong> {p.description}</div>}
            </div>
          )}

          {/* Submitter contact — surfaced so admin can WhatsApp / email
              about payment without digging into the row. */}
          {(p.submitted_name || p.submitted_email || p.submitted_whatsapp) && (
            <div className="mt-2 p-2 rounded-lg bg-black/40 border border-white/5 text-[12px]">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim mb-1">Owner</div>
              <div className="space-y-0.5">
                {p.submitted_name && <div><span className="text-dim">Name:</span> {p.submitted_name}</div>}
                {p.submitted_whatsapp && (
                  <div>
                    <span className="text-dim">WA:</span>{' '}
                    <a
                      href={`https://wa.me/${p.submitted_whatsapp.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      {p.submitted_whatsapp}
                    </a>
                  </div>
                )}
                {p.submitted_email && (
                  <div>
                    <span className="text-dim">Email:</span>{' '}
                    <a href={`mailto:${p.submitted_email}`} className="text-brand hover:underline">{p.submitted_email}</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tier + payment + tags strip */}
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
              {p.listing_tier}
            </span>
            {paidUntil
              ? <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Paid · until {paidUntil}</span>
              : <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>Unpaid</span>}
            {p.verified && (
              <span className="px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider" style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15' }}>Verified</span>
            )}
            {(p.tags ?? []).map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded text-muted bg-white/5 border border-white/5">{t}</span>
            ))}
            <span className="ml-auto text-dim font-mono">{created}</span>
          </div>

          {p.rejection_note && (
            <div className="mt-2 text-[12px] text-red-300 bg-red-900/20 border border-red-500/20 rounded p-2">
              <strong>Rejected:</strong> {p.rejection_note}
            </div>
          )}

          {/* Image thumbnail strip if multiple photos */}
          {(p.image_urls?.length ?? 0) > 1 && (
            <div className="mt-2 flex items-center gap-1 overflow-x-auto">
              {p.image_urls!.slice(1).map((u) => (
                <img key={u} src={u} alt="" className="w-12 h-12 rounded-md object-cover shrink-0 border border-white/10" />
              ))}
            </div>
          )}

          <div className="mt-3">
            <PlaceRowActions
              placeId={p.id}
              status={p.status}
              hasPaid={!!p.paid_until}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: PlaceRow['status'] }) {
  const styles: Record<PlaceRow['status'], { bg: string; fg: string }> = {
    pending:   { bg: 'rgba(250,204,21,0.15)', fg: '#FACC15' },
    approved:  { bg: 'rgba(34,197,94,0.15)',  fg: '#22C55E' },
    rejected:  { bg: 'rgba(239,68,68,0.15)',  fg: '#EF4444' },
    suspended: { bg: 'rgba(148,163,184,0.18)',fg: '#94A3B8' },
  }
  const s = styles[status]
  return (
    <span
      className="shrink-0 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider"
      style={{ background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  )
}
