import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Compass, Edit3, ChevronRight, Clock, CheckCircle2, AlertTriangle, Ban, MapPin, ExternalLink } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getServerSupabase } from '@/lib/supabase/server'
import { findTourService } from '@/data/tourServices'
import { getLanguageByCode } from '@/data/tourLanguages'
import DeleteTourGuideButton from '@/components/tour/DeleteTourGuideButton'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  slug: string
  name: string
  city: string
  address: string | null
  services: string[]
  languages: string[]
  day_rate_idr: number | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'paused'
  rejection_note: string | null
  updated_at: string
}

export default async function DashboardTourGuidePage() {
  const supabase = await getServerSupabase()
  if (!supabase) return <p className="p-6 text-muted">Server not configured.</p>

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard/tour-guide')

  const { data: rows } = await supabase
    .from('tour_guide_listings')
    .select('id, slug, name, city, address, services, languages, day_rate_idr, notes, status, rejection_note, updated_at')
    .eq('owner_user_id', user.id)
    .order('updated_at', { ascending: false })

  const row = ((rows as Row[] | null) ?? [])[0] ?? null

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-16">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-24 space-y-5">
          <header className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
                My <span className="gradient-text">Tour Guide</span>
              </h1>
              <p className="text-[13px] text-muted mt-1">
                Profil tour guide kamu di City Riders. 1 listing per akun — edit kapan saja.
              </p>
            </div>
            {!row && (
              <Link
                href="/tour/list/auth"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                New
              </Link>
            )}
          </header>

          {!row && (
            <div className="card p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)', border: '1px solid rgba(0,0,0,0.85)' }}>
                <Compass className="w-6 h-6 text-bg" strokeWidth={2.5} />
              </div>
              <div className="text-[14px] font-extrabold text-ink">Belum ada listing tour guide</div>
              <p className="text-[12px] text-muted leading-snug">
                Daftar gratis kalau kamu City Rider driver aktif. Tour guide independen Rp 38.000/bulan.
              </p>
              <Link
                href="/tour/list/auth"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85"
              >
                <Plus className="w-4 h-4" />
                Buat listing tour guide
              </Link>
            </div>
          )}

          {row && (
            <article className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-extrabold text-ink leading-tight truncate">{row.name}</h2>
                  <div className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                    <MapPin className="w-3 h-3" />
                    <span className="capitalize truncate">{row.city.replace(/-/g, ' ')}</span>
                    {row.address && <span className="truncate">· {row.address}</span>}
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>

              {row.day_rate_idr != null && (
                <div className="text-[14px] font-extrabold text-ink">
                  Rp {row.day_rate_idr.toLocaleString('id-ID')}
                  <span className="text-muted font-bold text-[12px]"> / hari</span>
                </div>
              )}

              {row.services?.length > 0 && (
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-brand mb-1.5">Services</div>
                  <div className="flex flex-wrap gap-1.5">
                    {row.services.map((sid) => {
                      const s = findTourService(sid)
                      if (!s) return null
                      return (
                        <span key={sid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold" style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.30)' }}>
                          <span aria-hidden>{s.emoji}</span>{s.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {row.languages?.length > 0 && (
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1.5">Languages</div>
                  <div className="flex flex-wrap gap-1">
                    {row.languages.map((code) => {
                      const l = getLanguageByCode(code)
                      if (!l) return null
                      return (
                        <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold text-ink/85" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span aria-hidden>{l.flag}</span>{l.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {row.status === 'rejected' && row.rejection_note && (
                <div className="rounded-lg p-2 text-[12px] text-red-200" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}>
                  <strong className="text-red-300">Ditolak admin:</strong> {row.rejection_note}
                </div>
              )}

              {row.status === 'paused' && (
                <div className="rounded-lg p-2 text-[12px] text-yellow-200" style={{ background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.30)' }}>
                  Listing kamu di-pause karena subscription tour guide kamu lewat. <Link href="/tour/upgrade" className="underline font-extrabold">Renew di /tour/upgrade</Link>.
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap pt-1">
                <Link
                  href={`/dashboard/tour-guide/${row.id}/edit`}
                  className="inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider text-brand"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                  <ChevronRight className="w-3 h-3" />
                </Link>
                {row.status === 'approved' && (
                  <Link
                    href={`/tour/${row.slug}`}
                    className="inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wider text-muted hover:text-ink"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View live
                  </Link>
                )}
                <DeleteTourGuideButton listingId={row.id} label={row.name} />
              </div>
            </article>
          )}
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
    paused:    { Icon: Clock,         label: 'Paused',    color: '#FACC15', bg: 'rgba(250,204,21,0.12)' },
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
