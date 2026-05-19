'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft, CheckCircle2, Circle, Scale, AlertCircle } from 'lucide-react'
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
