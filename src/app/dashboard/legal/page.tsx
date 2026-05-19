'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ChevronLeft, CheckCircle2, Circle, Scale, AlertCircle,
  CalendarClock, Shield, Siren, ChevronRight, Loader2,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'

// What a City Rider subscriber needs to operate LEGALLY as an
// independent motorcycle courier in Indonesia. A self-check list —
// City Rider does NOT enforce these (we'd become an employer if we
// did), but we want every rider to know what they're responsible for.
//
// Sources: UU 22/2009 (LLAJ), Permenhub PM 12/2019 (online ojek),
// UU 7/2021 (HPP — tax simplifications), and standard Indonesian
// motorbike commercial-use practice.

type RequirementId =
  | 'ktp' | 'sim-c' | 'stnk' | 'pkb' | 'helmet' | 'headlights'
  | 'bpjs-kes' | 'bpjs-tk' | 'insurance' | 'jaket' | 'whatsapp-business'
  | 'npwp' | 'nib' | 'pramuwisata'

const REQUIREMENTS: Array<{
  id: RequirementId
  category: 'Required by law' | 'Strongly recommended' | 'Optional but professional'
  title: string
  desc: string
  fine?: string
  link?: { label: string; href: string }
}> = [
  // ─── Required by law ───────────────────────────────────────────
  { id: 'ktp', category: 'Required by law',
    title: 'KTP — National ID',
    desc: 'Kartu Tanda Penduduk must be valid + carried. Baseline ID; you cannot obtain SIM C, NPWP, or BPJS without it.',
    link: { label: 'Disdukcapil', href: 'https://www.dukcapil.kemendagri.go.id' } },
  { id: 'sim-c', category: 'Required by law',
    title: 'SIM C — Motorcycle licence',
    desc: 'Valid Indonesian motorcycle licence (SIM C). Driving without one is illegal under UU 22/2009 and renders any insurance claim void.',
    fine: 'Pasal 281: max Rp 1.000.000 fine or 4 months jail',
    link: { label: 'Apply at SATPAS', href: 'https://www.korlantas.polri.go.id' } },
  { id: 'stnk', category: 'Required by law',
    title: 'STNK — Vehicle registration',
    desc: 'Surat Tanda Nomor Kendaraan must be valid + carried while riding. Mandatory under UU 22/2009 Pasal 70.',
    fine: 'Pasal 288(1): max Rp 500.000 fine or 2 months jail' },
  { id: 'pkb', category: 'Required by law',
    title: 'Pajak Kendaraan Bermotor (PKB) — Active vehicle tax',
    desc: 'Annual motor-vehicle tax must be paid on time. Visible on your STNK as the next-due date. Lapsed PKB = unregistered vehicle in the eyes of police.',
    fine: 'Pasal 288: same as STNK violation' },
  { id: 'helmet', category: 'Required by law',
    title: 'Helm SNI — Standard helmet',
    desc: 'Both rider AND passenger must wear SNI-certified helmets. Mandatory under UU 22/2009 Pasal 106(8).',
    fine: 'Pasal 291: max Rp 250.000 fine or 1 month jail (per person)' },
  { id: 'headlights', category: 'Required by law',
    title: 'Daytime headlights on',
    desc: 'Motorcycle headlights must be lit at all times when riding — day and night. UU 22/2009 Pasal 107(2). Common ticket.',
    fine: 'Pasal 293(2): max Rp 100.000 fine or 15 days jail' },
  { id: 'bpjs-kes', category: 'Required by law',
    title: 'BPJS Kesehatan — Health insurance',
    desc: 'Mandatory for every Indonesian citizen under UU 24/2011 (SJSN). Independent-worker class: PBPU. Currently underenforced but technically required.',
    link: { label: 'bpjs-kesehatan.go.id', href: 'https://www.bpjs-kesehatan.go.id' } },

  // ─── Strongly recommended ───────────────────────────────────────
  { id: 'bpjs-tk', category: 'Strongly recommended',
    title: 'BPJS Ketenagakerjaan (BPU) — Work-accident protection',
    desc: 'PP 44/2015 lets self-employed riders enrol under the BPU (Bukan Penerima Upah) scheme. From ~Rp 16.800/month for Jaminan Kecelakaan Kerja + Jaminan Kematian. Single biggest financial risk-reducer.',
    link: { label: 'bpjsketenagakerjaan.go.id', href: 'https://www.bpjsketenagakerjaan.go.id' } },
  { id: 'insurance', category: 'Strongly recommended',
    title: 'Personal accident insurance',
    desc: 'Jasa Raharja (built into your STNK via SWDKLLJ) covers other-party injury but NOT loss of income. Add commercial cover (Allianz, Axa Mandiri, Sompo) ~Rp 50–100K/year for your own income protection.' },
  { id: 'jaket', category: 'Strongly recommended',
    title: 'Safety gear',
    desc: 'Riding jacket, gloves, closed shoes. Required mindset if you transport passengers. Visibility vest helpful for night work — saves your life, not just legal exposure.' },
  { id: 'whatsapp-business', category: 'Strongly recommended',
    title: 'WhatsApp Business account',
    desc: 'Free app gives you a business profile, quick replies, and labels for organising customer chats. Looks more professional + lets you set away-hours.',
    link: { label: 'WhatsApp Business', href: 'https://business.whatsapp.com' } },

  // ─── Optional but professional ──────────────────────────────────
  { id: 'npwp', category: 'Optional but professional',
    title: 'NPWP — Tax number',
    desc: 'Required if your annual income exceeds PTKP (Rp 54.000.000/year for single status TK0, Rp 58.500.000 for married K0). Under UU 7/2021 you can use PPh Final 0.5% as an MSME — straightforward and cheap.',
    link: { label: 'Register at pajak.go.id', href: 'https://www.pajak.go.id' } },
  { id: 'nib', category: 'Optional but professional',
    title: 'NIB — Business ID number',
    desc: 'Nomor Induk Berusaha via OSS (Online Single Submission). Free, ~30 min online. Marks you as a legal usaha mikro and unlocks bank business accounts, supplier credit, etc.',
    link: { label: 'oss.go.id', href: 'https://oss.go.id' } },
  { id: 'pramuwisata', category: 'Optional but professional',
    title: 'Pramuwisata licence — Bali tour drivers only',
    desc: 'If you guide tourists (not just drive them), Perda Bali 5/2020 + Permenparekraf 8/2021 require a Pramuwisata Madya/Muda card from Dinas Pariwisata. Skip if you only do transport, not guiding.',
    link: { label: 'Disparda Bali', href: 'https://disparda.baliprov.go.id' } },
]

export default function DashboardLegalPage() {
  // Rider's self-check state — purely client-side localStorage; City Rider
  // does NOT verify these. Acting as a checker (and gating subscription
  // on them) would shift us toward employer-like control of subscribers.
  const [checked, setChecked] = useState<Set<RequirementId>>(new Set())

  function toggle(id: RequirementId) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id); else next.add(id)
    setChecked(next)
  }

  const lawDone   = REQUIREMENTS.filter(r => r.category === 'Required by law').filter(r => checked.has(r.id)).length
  const lawTotal  = REQUIREMENTS.filter(r => r.category === 'Required by law').length

  // Renewal calendar — driver-entered dates for SIM C, STNK, PKB, BPJS,
  // Pramuwisata. Each field is independent; driver fills in whichever
  // they have. Auto-loaded from /api/driver-renewals on mount.
  type Renewals = {
    sim_c_expires_on: string | null
    stnk_expires_on: string | null
    pkb_due_on: string | null
    bpjs_kes_paid_until: string | null
    bpjs_tk_paid_until: string | null
    pramuwisata_expires_on: string | null
  }
  const EMPTY_RENEWALS: Renewals = {
    sim_c_expires_on: null,
    stnk_expires_on: null,
    pkb_due_on: null,
    bpjs_kes_paid_until: null,
    bpjs_tk_paid_until: null,
    pramuwisata_expires_on: null,
  }
  const [renewals, setRenewals] = useState<Renewals>(EMPTY_RENEWALS)
  const [renewalsLoading, setRenewalsLoading] = useState(true)
  const [renewalsSaving, setRenewalsSaving]   = useState(false)
  const [renewalsSaved, setRenewalsSaved]     = useState(false)
  const [renewalsErr, setRenewalsErr]         = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/driver-renewals')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.row) {
          setRenewals({
            sim_c_expires_on:       j.row.sim_c_expires_on       ?? null,
            stnk_expires_on:        j.row.stnk_expires_on        ?? null,
            pkb_due_on:             j.row.pkb_due_on             ?? null,
            bpjs_kes_paid_until:    j.row.bpjs_kes_paid_until    ?? null,
            bpjs_tk_paid_until:     j.row.bpjs_tk_paid_until     ?? null,
            pramuwisata_expires_on: j.row.pramuwisata_expires_on ?? null,
          })
        }
        setRenewalsLoading(false)
      })
      .catch(() => { setRenewalsLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function saveRenewals() {
    setRenewalsErr(null); setRenewalsSaved(false); setRenewalsSaving(true)
    try {
      const res = await fetch('/api/driver-renewals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewals),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setRenewalsErr(j.error || 'Save failed'); return }
      setRenewalsSaved(true)
      setTimeout(() => setRenewalsSaved(false), 2000)
    } finally {
      setRenewalsSaving(false)
    }
  }

  function setRenewalDate(field: keyof Renewals, v: string) {
    setRenewals((r) => ({ ...r, [field]: v || null }))
    setRenewalsSaved(false)
  }

  // Computed status for each renewal date: red < 14 days, amber < 30,
  // green otherwise; "expired" for past-due. Returns null if no date.
  function daysToGo(iso: string | null): { days: number; tone: 'expired'|'red'|'amber'|'green' } | null {
    if (!iso) return null
    const now = new Date()
    const target = new Date(iso + 'T00:00:00')
    const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
    if (days < 0)    return { days, tone: 'expired' }
    if (days <= 14)  return { days, tone: 'red' }
    if (days <= 30)  return { days, tone: 'amber' }
    return { days, tone: 'green' }
  }

  const RENEWAL_FIELDS: Array<{ key: keyof Renewals; label: string; hint: string }> = [
    { key: 'sim_c_expires_on',       label: 'SIM C expires',         hint: 'Motorcycle licence — renew every 5 years' },
    { key: 'stnk_expires_on',        label: 'STNK expires',          hint: 'Full STNK renewal — every 5 years' },
    { key: 'pkb_due_on',             label: 'PKB next due',          hint: 'Annual vehicle tax (visible on STNK)' },
    { key: 'bpjs_kes_paid_until',    label: 'BPJS Kesehatan paid until', hint: 'Monthly health-insurance premium' },
    { key: 'bpjs_tk_paid_until',     label: 'BPJS TK paid until',    hint: 'Optional — work-accident protection' },
    { key: 'pramuwisata_expires_on', label: 'Pramuwisata expires',   hint: 'Bali tour-driver only — Dispar permit' },
  ]

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <Link href="/dashboard" className="text-[13px] text-muted hover:text-ink font-bold flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/25 flex items-center justify-center">
                <Scale className="w-4 h-4 text-brand" />
              </div>
              <h1 className="text-2xl font-extrabold">Legal requirements</h1>
            </div>
            <p className="text-muted text-[14px]">
              What you need to legally operate as an independent motorcycle courier in Indonesia.
              City Rider does not verify these — that&apos;s on you as an independent business.
            </p>
          </header>

          {/* Compliance summary */}
          <div className="card p-4 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{ background: lawDone === lawTotal
                ? 'radial-gradient(ellipse at top right, rgba(34,197,94,0.16), transparent 60%)'
                : 'radial-gradient(ellipse at top right, rgba(250,204,21,0.12), transparent 60%)' }}
            />
            <div className="relative">
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
                Required by law
              </div>
              <div className="text-2xl font-extrabold mt-1">
                {lawDone === lawTotal
                  ? <><span className="text-online">All set ✓</span></>
                  : <><span className="gradient-text">{lawDone}/{lawTotal}</span> <span className="text-muted text-[14px]">items confirmed</span></>}
              </div>
              <div className="text-[12px] text-muted mt-2">
                Check boxes below as you confirm each item. City Rider stores nothing — these
                are your reminders.
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="card p-4 bg-brand/5 border-brand/25 flex gap-3 text-[13px]">
            <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div className="text-ink/85 leading-relaxed">
              <strong className="text-brand">Why we&apos;re showing you this:</strong> as an
              independent rider you&apos;re your own business. City Rider provides the directory
              software — you provide the service. If something goes wrong on a trip, you (not
              the platform) deal with it. These requirements protect you.
            </div>
          </div>

          {/* Pocket reference cards — police stop + accident protocol.
              Both are static guidance pages, no DB. Drivers bookmark
              these for the worst moment of a working day. */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard/legal/police-stop"
              className="card card-interactive p-3"
              style={{ borderColor: 'rgba(96,165,250,0.30)', background: 'rgba(59,130,246,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <Shield className="w-5 h-5" style={{ color: '#60A5FA' }} />
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
              <div className="text-[13px] font-extrabold mt-2">If police stop you</div>
              <div className="text-[11px] text-muted mt-0.5 leading-snug">
                Documents + what to say
              </div>
            </Link>
            <Link
              href="/dashboard/legal/accident"
              className="card card-interactive p-3"
              style={{ borderColor: 'rgba(239,68,68,0.30)', background: 'rgba(239,68,68,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <Siren className="w-5 h-5" style={{ color: '#EF4444' }} />
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
              <div className="text-[13px] font-extrabold mt-2">In case of accident</div>
              <div className="text-[11px] text-muted mt-0.5 leading-snug">
                Jasa Raharja · BPJS · 110
              </div>
            </Link>
          </div>

          {/* Renewal calendar — driver-entered dates with countdown badges */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-brand" />
              <h2 className="text-[14px] font-extrabold">Renewal calendar</h2>
            </div>
            <p className="text-[12px] text-muted leading-snug">
              Enter the expiry/due date of each document. The dashboard shows a countdown.
              All dates stay in your private record — only you can see them.
            </p>

            {renewalsLoading ? (
              <div className="py-4 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted" />
              </div>
            ) : (
              <div className="space-y-2">
                {RENEWAL_FIELDS.map((f) => {
                  const value = renewals[f.key] ?? ''
                  const status = daysToGo(value || null)
                  const toneColor =
                    status?.tone === 'expired' ? '#EF4444'
                    : status?.tone === 'red'    ? '#EF4444'
                    : status?.tone === 'amber'  ? '#F97316'
                    : status?.tone === 'green'  ? '#22C55E'
                    : '#64748B'
                  return (
                    <div key={f.key} className="flex items-stretch gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-dim">
                          {f.label}
                        </label>
                        <input
                          type="date"
                          value={value}
                          onChange={(e) => setRenewalDate(f.key, e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-[13px] text-ink focus:outline-none focus:border-brand/40"
                        />
                        <p className="text-[10px] text-dim mt-1">{f.hint}</p>
                      </div>
                      <div
                        className="shrink-0 self-end px-2 py-1.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap min-w-[88px] text-center"
                        style={{
                          color: toneColor,
                          background: status ? `${toneColor}1A` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${status ? `${toneColor}55` : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {status === null && '—'}
                        {status?.tone === 'expired' && `Expired ${Math.abs(status.days)}d`}
                        {status?.tone === 'red'     && `${status.days}d left`}
                        {status?.tone === 'amber'   && `${status.days}d left`}
                        {status?.tone === 'green'   && `${status.days}d`}
                      </div>
                    </div>
                  )
                })}
                {renewalsErr && (
                  <div className="text-[12px] text-red-400 font-bold">{renewalsErr}</div>
                )}
                <button
                  type="button"
                  onClick={saveRenewals}
                  disabled={renewalsSaving}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[12px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
                >
                  {renewalsSaving
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                    : renewalsSaved
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
                      : <><CheckCircle2 className="w-3.5 h-3.5" /> Save dates</>}
                </button>
              </div>
            )}
          </section>

          {/* Requirements groups */}
          {(['Required by law', 'Strongly recommended', 'Optional but professional'] as const).map(cat => {
            const items = REQUIREMENTS.filter(r => r.category === cat)
            const catColor =
              cat === 'Required by law' ? '#EF4444'
              : cat === 'Strongly recommended' ? '#FACC15'
              : '#94A3B8'
            return (
              <section key={cat} className="space-y-2">
                <div className="text-[12px] uppercase tracking-wider font-extrabold flex items-center gap-2 px-1" style={{ color: catColor }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: catColor }} />
                  {cat}
                </div>
                {items.map(r => {
                  const isChecked = checked.has(r.id)
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      className="card card-interactive p-4 w-full text-left flex gap-3 items-start"
                    >
                      <div className="shrink-0 mt-0.5">
                        {isChecked
                          ? <CheckCircle2 className="w-5 h-5 text-online" />
                          : <Circle className="w-5 h-5 text-dim" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-[14px]">{r.title}</div>
                        <p className="text-[13px] text-muted leading-relaxed mt-1">{r.desc}</p>
                        {r.fine && (
                          <div
                            className="text-[11px] font-bold mt-1.5 px-2 py-1 rounded-md inline-block"
                            style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.30)' }}
                          >
                            ⚠ {r.fine}
                          </div>
                        )}
                        {r.link && (
                          <a
                            href={r.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-brand mt-2 hover:underline ml-2 first:ml-0"
                          >
                            {r.link.label} →
                          </a>
                        )}
                      </div>
                    </button>
                  )
                })}
              </section>
            )
          })}

          {/* Closing note */}
          <div className="card p-4 text-[13px] text-ink/85 leading-relaxed">
            <strong>You are not an employee of City Rider.</strong> We sell you software (Rp
            30,000/month). You decide who to serve, what to charge, when to work, and how to
            operate. With independence comes responsibility — these requirements are part of it.
          </div>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}
