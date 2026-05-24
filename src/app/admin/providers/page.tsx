import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import ProviderActions from './ProviderActions'

// ============================================================================
// Unified providers admin page
// ----------------------------------------------------------------------------
// One screen lets the admin approve / reject / suspend across every
// provider category (partners, massage_providers, tour_guide_listings)
// AND toggle visibility on every mock pool AND review pending partner
// bookings. Avoids the need for 7 separate admin pages.
//
// All mutations route through POST /api/admin/providers (single endpoint,
// dispatched on `table` + `action`). Audit log captures every change.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function ProvidersAdminPage() {
  const admin = getAdminSupabase()
  if (!admin) return <p className="p-6 text-muted">Server not configured.</p>

  // ── Fetch all relevant rows in parallel — small tables, OK to read full ──
  const [
    partnersRes, massageRes, tourRes,
    beauticianRes, laundryRes, handymanRes, homeCleanRes,
    mockDriversRes, mockRentalsRes, mockToursRes,
    bookingsRes,
  ] = await Promise.all([
    admin.from('partners')
      .select('id, slug, name, partner_type, status, contact_email, contact_whatsapp, city, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('massage_providers')
      .select('id, slug, display_name, gender, status, availability, ktp_image_url, whatsapp_e164, city, is_mock, mock_hidden_at, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('tour_guide_listings')
      .select('id, slug, name, whatsapp_e164, city, status, availability, paid_until, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('beautician_providers')
      .select('id, slug, display_name, status, availability, ktp_image_url, whatsapp_e164, city, is_mock, mock_hidden_at, subscription_status, paid_until, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('laundry_providers')
      .select('id, slug, display_name, status, availability, ktp_image_url, whatsapp_e164, city, is_mock, mock_hidden_at, subscription_status, paid_until, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('handyman_providers')
      .select('id, slug, display_name, status, availability, ktp_image_url, whatsapp_e164, city, is_mock, mock_hidden_at, subscription_status, paid_until, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('home_clean_providers')
      .select('id, slug, display_name, status, availability, ktp_image_url, whatsapp_e164, city, is_mock, mock_hidden_at, subscription_status, paid_until, created_at')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('mock_drivers')
      .select('id, slug, business_name, city, services, availability, mock_hidden_at, created_at')
      .order('created_at', { ascending: true }),
    admin.from('mock_bike_rentals')
      .select('id, slug, owner_name, brand, model, city, daily_price_idr, mock_hidden_at, created_at')
      .order('created_at', { ascending: true }),
    admin.from('mock_tour_guide_listings')
      .select('id, slug, name, city, day_rate_idr, availability, mock_hidden_at, created_at')
      .order('created_at', { ascending: true }),
    admin.from('partner_bookings')
      .select(`
        id, partner_id, driver_user_id, fare_idr, commission_idr,
        status, settled_at, dispute_reason, created_at, due_at
      `)
      .order('created_at', { ascending: false }).limit(80),
  ])

  const partners      = partnersRes.data ?? []
  const massage       = massageRes.data ?? []
  const tours         = tourRes.data ?? []
  const beautician    = beauticianRes.data ?? []
  const laundry       = laundryRes.data ?? []
  const handyman      = handymanRes.data ?? []
  const homeClean     = homeCleanRes.data ?? []
  const mockDrivers   = mockDriversRes.data ?? []
  const mockRentals   = mockRentalsRes.data ?? []
  const mockTours     = mockToursRes.data ?? []
  const bookings      = bookingsRes.data ?? []

  // Counts shown at the top so admin sees pending workload at a glance.
  const counts = {
    partnersPending:   partners.filter((p) => p.status === 'pending').length,
    massagePending:    massage.filter((m) => m.status === 'pending' && !m.is_mock).length,
    toursPending:      tours.filter((t) => t.status === 'pending').length,
    beauticianPending: beautician.filter((b) => b.status === 'pending' && !b.is_mock).length,
    laundryPending:    laundry.filter((l) => l.status === 'pending' && !l.is_mock).length,
    handymanPending:   handyman.filter((h) => h.status === 'pending' && !h.is_mock).length,
    homeCleanPending:  homeClean.filter((c) => c.status === 'pending' && !c.is_mock).length,
    bookingsAwait:     bookings.filter((b) => b.status === 'pending').length,
    mockVisible:       mockDrivers.filter((m) => !m.mock_hidden_at).length
                     + mockRentals.filter((m) => !m.mock_hidden_at).length
                     + mockTours.filter((m) => !m.mock_hidden_at).length
                     + massage.filter((m) => m.is_mock && !m.mock_hidden_at).length
                     + beautician.filter((m) => m.is_mock && !m.mock_hidden_at).length
                     + laundry.filter((m) => m.is_mock && !m.mock_hidden_at).length
                     + handyman.filter((m) => m.is_mock && !m.mock_hidden_at).length
                     + homeClean.filter((m) => m.is_mock && !m.mock_hidden_at).length,
  }

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-[22px] font-extrabold leading-tight">Providers</h1>
        <p className="text-[12px] text-muted mt-1">
          One screen — approve, suspend, review bookings, toggle mock visibility.
          Every action lands in the audit log.
        </p>
      </header>

      {/* Workload counters */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[12px]">
        <Counter label="Partners pending"   n={counts.partnersPending} />
        <Counter label="Massage pending"    n={counts.massagePending} />
        <Counter label="Beautician pending" n={counts.beauticianPending} />
        <Counter label="Laundry pending"    n={counts.laundryPending} />
        <Counter label="Handyman pending"   n={counts.handymanPending} />
        <Counter label="Home Clean pending" n={counts.homeCleanPending} />
        <Counter label="Tours pending"      n={counts.toursPending} />
        <Counter label="Bookings to settle" n={counts.bookingsAwait} />
        <Counter label="Mocks visible"      n={counts.mockVisible} />
      </section>

      {/* ─── PARTNERS ────────────────────────────────────────────────── */}
      <Section title="Partners (hotels, villas, private sellers)">
        {partners.length === 0 ? (
          <Empty>No partners yet.</Empty>
        ) : (
          <Table head={['Name', 'Type', 'City', 'Status', 'Actions']}>
            {partners.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2 pr-3">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-[11px] text-muted truncate">{p.slug}</div>
                </td>
                <td className="py-2 pr-3 text-[12px] capitalize">{(p.partner_type ?? '').replace('_', ' ')}</td>
                <td className="py-2 pr-3 text-[12px] text-muted">{p.city ?? '—'}</td>
                <td className="py-2 pr-3"><Pill v={p.status} /></td>
                <td className="py-2">
                  <ProviderActions
                    table="partners"
                    id={p.id}
                    buttons={[
                      ...(p.status !== 'active'    ? [{ action: 'approve' as const, label: 'Approve', tone: 'primary' as const }] : []),
                      ...(p.status !== 'suspended' ? [{ action: 'suspend' as const, label: 'Suspend', tone: 'warn' as const }] : []),
                      ...(p.status === 'suspended' ? [{ action: 'activate' as const, label: 'Reactivate', tone: 'ghost' as const }] : []),
                      ...(p.status === 'pending'   ? [{ action: 'reject' as const,  label: 'Reject',  tone: 'danger' as const, needsReason: true }] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ─── MASSAGE THERAPISTS ──────────────────────────────────────── */}
      <Section title="Massage therapists">
        {massage.filter((m) => !m.is_mock).length === 0 ? (
          <Empty>No real therapist signups yet.</Empty>
        ) : (
          <Table head={['Name', 'Gender', 'City', 'KTP', 'Status', 'Actions']}>
            {massage.filter((m) => !m.is_mock).map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="py-2 pr-3">
                  <div className="font-bold">{m.display_name}</div>
                  <div className="text-[11px] text-muted truncate">{m.slug}</div>
                </td>
                <td className="py-2 pr-3 text-[12px] capitalize">{m.gender === 'woman' ? 'Wanita' : 'Pria'}</td>
                <td className="py-2 pr-3 text-[12px] text-muted">{m.city ?? '—'}</td>
                <td className="py-2 pr-3 text-[12px]">
                  {m.ktp_image_url
                    ? <a href={m.ktp_image_url} target="_blank" rel="noopener" className="text-brand underline">View</a>
                    : <span className="text-muted">—</span>}
                </td>
                <td className="py-2 pr-3"><Pill v={m.status} /></td>
                <td className="py-2">
                  <ProviderActions
                    table="massage_providers"
                    id={m.id}
                    buttons={[
                      ...(m.status !== 'active'    ? [{ action: 'approve' as const, label: 'Approve', tone: 'primary' as const }] : []),
                      ...(m.status !== 'suspended' ? [{ action: 'suspend' as const, label: 'Suspend', tone: 'warn' as const }] : []),
                      ...(m.status === 'suspended' ? [{ action: 'activate' as const, label: 'Reactivate', tone: 'ghost' as const }] : []),
                      ...(m.status === 'pending'   ? [{ action: 'reject' as const,  label: 'Reject',  tone: 'danger' as const, needsReason: true }] : []),
                      ...(m.status === 'active'    ? [
                        { action: 'mark_paid_monthly' as const, label: '+30d',  tone: 'ghost' as const },
                        { action: 'mark_paid_yearly'  as const, label: '+365d', tone: 'ghost' as const },
                      ] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ─── BEAUTICIAN ──────────────────────────────────────────────── */}
      <StandardProviderSection
        title="Beauticians"
        table="beautician_providers"
        emptyMsg="No real beautician signups yet."
        rows={beautician.filter((b) => !b.is_mock)}
      />

      {/* ─── LAUNDRY ────────────────────────────────────────────────── */}
      <StandardProviderSection
        title="Laundry shops"
        table="laundry_providers"
        emptyMsg="No real laundry shop signups yet."
        rows={laundry.filter((l) => !l.is_mock)}
      />

      {/* ─── HANDYMAN ────────────────────────────────────────────────── */}
      <StandardProviderSection
        title="Handyman (Tukang)"
        table="handyman_providers"
        emptyMsg="No real handyman signups yet."
        rows={handyman.filter((h) => !h.is_mock)}
      />

      {/* ─── HOME CLEAN ─────────────────────────────────────────────── */}
      <StandardProviderSection
        title="Home Clean"
        table="home_clean_providers"
        emptyMsg="No real cleaner signups yet."
        rows={homeClean.filter((c) => !c.is_mock)}
      />

      {/* ─── TOUR GUIDES ─────────────────────────────────────────────── */}
      <Section title="Tour guides">
        {tours.length === 0 ? (
          <Empty>No tour guide listings yet.</Empty>
        ) : (
          <Table head={['Name', 'City', 'Availability', 'Status', 'Actions']}>
            {tours.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="py-2 pr-3">
                  <div className="font-bold">{t.name}</div>
                  <div className="text-[11px] text-muted truncate">{t.slug}</div>
                </td>
                <td className="py-2 pr-3 text-[12px] text-muted">{t.city ?? '—'}</td>
                <td className="py-2 pr-3 text-[12px] capitalize">{t.availability}</td>
                <td className="py-2 pr-3"><Pill v={t.status} /></td>
                <td className="py-2">
                  <ProviderActions
                    table="tour_guide_listings"
                    id={t.id}
                    buttons={[
                      ...(t.status !== 'approved'  ? [{ action: 'approve' as const, label: 'Approve', tone: 'primary' as const }] : []),
                      ...(t.status === 'approved'  ? [{ action: 'suspend' as const, label: 'Suspend', tone: 'warn' as const }] : []),
                      ...(t.status === 'suspended' ? [{ action: 'activate' as const, label: 'Reactivate', tone: 'ghost' as const }] : []),
                      ...(t.status === 'pending'   ? [{ action: 'reject' as const,  label: 'Reject',  tone: 'danger' as const, needsReason: true }] : []),
                      ...(t.status === 'approved'  ? [
                        { action: 'mark_paid_monthly' as const, label: '+30d',  tone: 'ghost' as const },
                        { action: 'mark_paid_yearly'  as const, label: '+365d', tone: 'ghost' as const },
                      ] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ─── PARTNER BOOKINGS ────────────────────────────────────────── */}
      <Section title="Partner bookings — settlement queue">
        {bookings.length === 0 ? (
          <Empty>No partner bookings yet.</Empty>
        ) : (
          <Table head={['Created', 'Fare', 'Commission', 'Status', 'Actions']}>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-line">
                <td className="py-2 pr-3 text-[12px] text-muted">
                  {new Date(b.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </td>
                <td className="py-2 pr-3 text-[12px]">Rp {b.fare_idr.toLocaleString('id-ID')}</td>
                <td className="py-2 pr-3 text-[12px] font-bold text-brand">Rp {b.commission_idr.toLocaleString('id-ID')}</td>
                <td className="py-2 pr-3"><Pill v={b.status} /></td>
                <td className="py-2">
                  {b.status === 'pending' ? (
                    <ProviderActions
                      table="partner_bookings"
                      id={b.id}
                      buttons={[
                        { action: 'settle',  label: 'Mark paid', tone: 'primary' },
                        { action: 'dispute', label: 'Dispute',   tone: 'danger', needsReason: true },
                        { action: 'waive',   label: 'Waive',     tone: 'ghost' },
                      ]}
                    />
                  ) : <span className="text-[11px] text-muted">—</span>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* ─── MOCK POOLS ──────────────────────────────────────────────── */}
      <Section title="Mock pools — visibility toggles">
        <MockBlock
          title="Mock drivers"
          table="mock_drivers"
          rows={mockDrivers.map((r) => ({
            id: r.id, slug: r.slug, name: r.business_name, meta: `${r.city ?? '—'} · ${(r.services ?? []).join('/')}`,
            mock_hidden_at: r.mock_hidden_at,
          }))}
        />
        <MockBlock
          title="Mock bike rentals"
          table="mock_bike_rentals"
          rows={mockRentals.map((r) => ({
            id: r.id, slug: r.slug, name: r.owner_name, meta: `${r.brand} ${r.model} · ${r.city ?? '—'}`,
            mock_hidden_at: r.mock_hidden_at,
          }))}
        />
        <MockBlock
          title="Mock tour guides"
          table="mock_tour_guide_listings"
          rows={mockTours.map((r) => ({
            id: r.id, slug: r.slug, name: r.name, meta: `${r.city ?? '—'} · Rp ${(r.day_rate_idr ?? 0).toLocaleString('id-ID')}/day`,
            mock_hidden_at: r.mock_hidden_at,
          }))}
        />
        <MockBlock
          title="Mock massage therapists"
          table="massage_providers"
          rows={massage.filter((m) => m.is_mock).map((m) => ({
            id: m.id, slug: m.slug, name: m.display_name, meta: `${m.gender === 'woman' ? 'Wanita' : 'Pria'} · ${m.city ?? '—'}`,
            mock_hidden_at: (m as { mock_hidden_at?: string | null }).mock_hidden_at ?? null,
          }))}
        />
        <p className="text-[11px] text-muted">
          Hidden mocks are not deleted — clicking <em>Show</em> brings them back into the marketplace.
          Each real signup in a category auto-hides one mock via a DB trigger.
        </p>
      </Section>

      <footer className="pt-4 text-[11px] text-muted">
        <Link href="/admin/audit" className="text-brand hover:underline">View audit log →</Link>
      </footer>
    </div>
  )
}

function Counter({ label, n }: { label: string; n: number }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-muted">{label}</div>
      <div className={`text-[22px] font-extrabold leading-none mt-1 ${n > 0 ? 'text-brand' : 'text-ink/70'}`}>{n}</div>
    </div>
  )
}

// Shared section for the 5 "standard" provider tables (massage / beautician
// / laundry / handyman / home_clean). All have the same lifecycle:
// pending → active → suspended/removed, status badge, KTP view link,
// approve/suspend/reactivate/reject + mark-paid actions.
type StandardProviderRow = {
  id: string
  slug: string
  display_name: string
  status: string
  city: string | null
  ktp_image_url: string | null
  paid_until?: string | null
  subscription_status?: string | null
}

function StandardProviderSection({
  title, table, emptyMsg, rows,
}: {
  title: string
  table: 'massage_providers' | 'beautician_providers' | 'laundry_providers' | 'handyman_providers' | 'home_clean_providers'
  emptyMsg: string
  rows: StandardProviderRow[]
}) {
  return (
    <Section title={title}>
      {rows.length === 0 ? (
        <Empty>{emptyMsg}</Empty>
      ) : (
        <Table head={['Name', 'City', 'KTP', 'Paid until', 'Status', 'Actions']}>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className="py-2 pr-3">
                <div className="font-bold">{p.display_name}</div>
                <div className="text-[11px] text-muted truncate">{p.slug}</div>
              </td>
              <td className="py-2 pr-3 text-[12px] text-muted">{p.city ?? '—'}</td>
              <td className="py-2 pr-3 text-[12px]">
                {p.ktp_image_url
                  ? <a href={p.ktp_image_url} target="_blank" rel="noopener" className="text-brand underline">View</a>
                  : <span className="text-muted">—</span>}
              </td>
              <td className="py-2 pr-3 text-[11px] text-muted">
                {p.paid_until
                  ? new Date(p.paid_until).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                  : <span className="text-dim">trial</span>}
              </td>
              <td className="py-2 pr-3"><Pill v={p.status} /></td>
              <td className="py-2">
                <ProviderActions
                  table={table}
                  id={p.id}
                  buttons={[
                    ...(p.status !== 'active'    ? [{ action: 'approve' as const, label: 'Approve', tone: 'primary' as const }] : []),
                    ...(p.status !== 'suspended' ? [{ action: 'suspend' as const, label: 'Suspend', tone: 'warn' as const }] : []),
                    ...(p.status === 'suspended' ? [{ action: 'activate' as const, label: 'Reactivate', tone: 'ghost' as const }] : []),
                    ...(p.status === 'pending'   ? [{ action: 'reject' as const,  label: 'Reject',  tone: 'danger' as const, needsReason: true }] : []),
                    ...(p.status === 'active'    ? [
                      { action: 'mark_paid_monthly' as const, label: '+30d',  tone: 'ghost' as const },
                      { action: 'mark_paid_yearly'  as const, label: '+365d', tone: 'ghost' as const },
                    ] : []),
                  ]}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-[15px] font-extrabold mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] text-muted py-2">{children}</div>
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider font-bold text-muted text-left">
            {head.map((h) => <th key={h} className="pb-1 pr-3 font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Pill({ v }: { v: string }) {
  const tones: Record<string, string> = {
    pending:   'bg-yellow-400/15 text-yellow-200 border-yellow-400/35',
    active:    'bg-green-500/15  text-green-300  border-green-500/35',
    approved:  'bg-green-500/15  text-green-300  border-green-500/35',
    settled:   'bg-green-500/15  text-green-300  border-green-500/35',
    suspended: 'bg-orange-500/15 text-orange-200 border-orange-500/35',
    rejected:  'bg-red-500/15    text-red-200    border-red-500/35',
    removed:   'bg-red-500/15    text-red-200    border-red-500/35',
    disputed:  'bg-red-500/15    text-red-200    border-red-500/35',
    waived:    'bg-white/5       text-muted      border-ink/15',
  }
  const tone = tones[v] ?? 'bg-white/5 text-muted border-ink/15'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${tone}`}>
      {v}
    </span>
  )
}

function MockBlock({
  title, table, rows,
}: {
  title: string
  table: string
  rows: { id: string; slug: string; name: string; meta: string; mock_hidden_at: string | null }[]
}) {
  if (rows.length === 0) return null
  return (
    <div className="mt-3 first:mt-0">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-muted mb-2">{title}</div>
      <div className="space-y-1">
        {rows.map((r) => {
          const hidden = !!r.mock_hidden_at
          return (
            <div key={r.id} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${hidden ? 'bg-white/[0.02] border-ink/10 opacity-60' : 'bg-white/[0.04] border-ink/15'}`}>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold truncate">{r.name}</div>
                <div className="text-[11px] text-muted truncate">{r.meta}</div>
              </div>
              <ProviderActions
                table={table}
                id={r.id}
                buttons={[
                  { action: 'toggle_mock_visibility', label: hidden ? 'Show' : 'Hide', tone: hidden ? 'primary' : 'ghost' },
                ]}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
