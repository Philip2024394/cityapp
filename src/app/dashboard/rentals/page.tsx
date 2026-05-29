import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Bike, Clock, CheckCircle2, AlertTriangle, Ban, Edit3, ChevronRight } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'
import { getServerSupabase } from '@/lib/supabase/server'
import DeleteRentalButton from '@/components/rent/DeleteRentalButton'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  brand: string
  model: string
  year: number | null
  cc: number | null
  city: string
  address: string | null
  image_urls: string[] | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  paid_until: string | null
  listing_tier: 'free' | 'paid' | 'featured'
  rejection_note: string | null
  daily_price_idr: number | null
  updated_at: string
}

export default async function DashboardRentalsPage() {
  const supabase = await getServerSupabase()
  if (!supabase) {
    return <p className="p-6 text-muted">Server not configured.</p>
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard/rentals')

  // RLS policy `bike_rentals_owner_read_own` from migration 0011 scopes to
  // rows where owner_user_id = auth.uid().
  const { data: rows, error } = await supabase
    .from('bike_rentals')
    .select('id, brand, model, year, cc, city, address, image_urls, status, paid_until, listing_tier, rejection_note, daily_price_idr, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-[100dvh] pb-16">
        <AppNav />
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <p className="text-red-400">{error.message}</p>
        </div>
      </main>
    )
  }

  const list = (rows as Row[] | null) ?? []
  const today = new Date()

  return (
    <>
      <AppNav />
      <main className="min-h-[100dvh] pb-16">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-24 space-y-5">
          <PWAInstallCard />
          <header className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
                My <span className="gradient-text">rentals</span>
              </h1>
              <p className="text-[13px] text-muted mt-1">
                Motorbikes you&apos;ve listed for rent. Edit specs, prices, photos.
              </p>
            </div>
            <Link
              href="/rent/list/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99] shrink-0"
            >
              <Plus className="w-4 h-4" />
              New
            </Link>
          </header>

          {list.length === 0 && (
            <div className="card p-6 text-center">
              <p className="text-[14px] text-muted">Belum ada motor yang kamu daftarkan.</p>
              <Link
                href="/rent/list/new"
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                Daftarkan motor pertama
              </Link>
            </div>
          )}

          <ul className="space-y-3">
            {list.map((r) => {
              const photo = r.image_urls?.[0] ?? null
              const daysLeft = r.paid_until ? daysBetween(today, new Date(r.paid_until)) : null
              return (
                <li key={r.id} className="card p-3 flex items-stretch gap-3">
                  <div className="w-20 shrink-0 rounded-xl overflow-hidden bg-black/60 border border-white/10">
                    {photo ? (
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Bike className="w-5 h-5 text-dim" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-[15px] font-extrabold text-ink leading-tight truncate">
                        {r.brand} {r.model}
                        {r.cc ? <span className="text-muted font-bold"> · {r.cc}cc</span> : null}
                      </h2>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-[12px] text-muted truncate">
                      {r.address ?? r.city}
                      {r.daily_price_idr ? ` · Rp ${(r.daily_price_idr).toLocaleString('id-ID')}/hari` : ''}
                    </div>
                    {r.status === 'rejected' && r.rejection_note && (
                      <p className="text-[12px] text-red-400 leading-snug">
                        <strong className="text-red-300">Ditolak:</strong> {r.rejection_note}
                      </p>
                    )}
                    {r.status === 'approved' && daysLeft != null && (
                      <p className="text-[12px] text-muted">
                        <Clock className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                        {daysLeft > 0
                          ? <>Aktif sampai <strong className="text-ink">{r.paid_until}</strong> ({daysLeft} hari)</>
                          : <span className="text-amber-400">Listing kadaluwarsa — hubungi admin</span>}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                      <Link
                        href={`/dashboard/rentals/${r.id}/edit`}
                        className="inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider text-brand"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                      <DeleteRentalButton rentalId={r.id} label={`${r.brand} ${r.model}`} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </main>
    </>
  )
}

function StatusBadge({ status }: { status: Row['status'] }) {
  const cfg = {
    pending:   { Icon: Clock,         label: 'Pending',   color: '#FACC15', bg: 'rgba(250,204,21,0.12)' },
    approved:  { Icon: CheckCircle2,  label: 'Approved',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    rejected:  { Icon: AlertTriangle, label: 'Rejected',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    suspended: { Icon: Ban,           label: 'Suspended', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  }[status]
  const Icon = cfg.Icon
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider shrink-0"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}55` }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.ceil(ms / 86_400_000)
}
