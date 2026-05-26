import Link from 'next/link'
import { ChevronLeft, Shield, FileText, Phone, AlertCircle } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

// ============================================================================
// /dashboard/legal/police-stop
// ----------------------------------------------------------------------------
// Pocket reference for the moment a tilang officer waves you over.
// Pure static guidance — no DB, no auth requirement to render. Drivers
// bookmark this and pull it up at the curb.
//
// Content drawn from Polri public-affairs guidance + UU 22/2009 Pasal
// 265 (police authority to stop) and Pasal 266 (driver's documents
// duty). Not legal advice — practical first-encounter checklist.
// ============================================================================

export const metadata = {
  title: 'If police stop you · IndoCity',
}

export default function PoliceStopPage() {
  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <Link
            href="/dashboard/legal"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink"
          >
            <ChevronLeft className="w-4 h-4" />
            Legal requirements
          </Link>

          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(96,165,250,0.40)' }}
              >
                <Shield className="w-4 h-4" style={{ color: '#60A5FA' }} />
              </div>
              <h1 className="text-2xl font-extrabold">If police stop you</h1>
            </div>
            <p className="text-muted text-[14px] leading-snug">
              Quick-reference for tilang stops. Stay calm, present documents in order,
              ask for an official receipt if you&apos;re ticketed.
            </p>
          </header>

          {/* What to do — numbered steps */}
          <section className="card p-4 space-y-3">
            <h2 className="text-[14px] font-extrabold">What to do, in order</h2>
            <ol className="space-y-3 text-[13px] leading-snug">
              <Step n={1} title="Pull over safely">
                Use indicator, stop on the shoulder, kill engine, remove helmet.
                Keep hands visible.
              </Step>
              <Step n={2} title="Present documents in this order">
                <ol className="mt-1.5 space-y-1 text-muted">
                  <li>• <strong className="text-ink">KTP</strong> — your national ID</li>
                  <li>• <strong className="text-ink">SIM C</strong> — motorcycle licence</li>
                  <li>• <strong className="text-ink">STNK</strong> — vehicle registration</li>
                </ol>
                <p className="mt-1.5 text-dim">
                  If the officer asks for BPKB (vehicle ownership book), politely say it&apos;s
                  kept at home — BPKB is not required to be carried while riding.
                </p>
              </Step>
              <Step n={3} title="Confirm the alleged violation">
                Ask: <em className="text-ink">&quot;Pelanggaran saya apa, pak?&quot;</em>
                Get the specific UU/Pasal. You have the right to know.
              </Step>
              <Step n={4} title="If ticketed — ask for the slip">
                Insist on a <strong className="text-ink">Slip Biru</strong>
                (admit, pay via bank to BRI/BNI) OR
                <strong className="text-ink"> Slip Merah</strong> (contest in court).
                Never settle with cash on the roadside — that&apos;s a bribe (suap),
                which is illegal under UU 31/1999 PTPK for both you and the officer.
              </Step>
              <Step n={5} title="Record + photograph">
                If you can do it without escalation: photograph the officer&apos;s name tag,
                badge number, and the ticket. Useful if you contest later.
              </Step>
              <Step n={6} title="When in doubt — ask to call Propam">
                Polri Profesi &amp; Pengamanan handles officer misconduct complaints.
                Call <strong className="text-ink">1500-727</strong>.
              </Step>
            </ol>
          </section>

          {/* Don'ts */}
          <section className="card p-4 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.30)' }}>
            <h2 className="text-[14px] font-extrabold flex items-center gap-2" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-4 h-4" />
              Don&apos;t
            </h2>
            <ul className="text-[13px] text-ink/85 space-y-1.5 leading-snug">
              <li>• Don&apos;t hand over cash directly. Always demand a tilang slip.</li>
              <li>• Don&apos;t argue or raise your voice. If the officer is wrong, contest via the Slip Merah pathway.</li>
              <li>• Don&apos;t hand over your phone unless they have a warrant.</li>
              <li>• Don&apos;t admit to anything you didn&apos;t do. Silence is your right.</li>
            </ul>
          </section>

          {/* Numbers */}
          <section className="card p-4 space-y-2">
            <h2 className="text-[14px] font-extrabold flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand" />
              Emergency / complaint numbers
            </h2>
            <ul className="text-[13px] space-y-1.5">
              <PhoneRow num="110" label="Polri emergency (any city)" />
              <PhoneRow num="1500-727" label="Propam Polri (officer misconduct)" />
              <PhoneRow num="1500-997" label="Korlantas info line (traffic)" />
              <PhoneRow num="LBH Lokal" label="Search 'LBH [your city]' for free legal aid" plain />
            </ul>
          </section>

          {/* Legal basis */}
          <section className="card p-4">
            <h2 className="text-[14px] font-extrabold flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-brand" />
              Legal basis
            </h2>
            <ul className="text-[12px] text-muted space-y-1 leading-snug">
              <li>• UU 22/2009 Pasal 265 — police authority to stop vehicles</li>
              <li>• UU 22/2009 Pasal 266 — driver&apos;s documents duty</li>
              <li>• UU 31/1999 jo. UU 20/2001 — Pemberantasan Tindak Pidana Korupsi (anti-bribery)</li>
              <li>• Perkapolri 10/2012 — Tata cara pemeriksaan kendaraan bermotor di jalan</li>
            </ul>
          </section>

          <p className="text-[11px] text-dim leading-snug">
            This is practical guidance, not legal advice. If you&apos;re ticketed and need help,
            contact LBH (Lembaga Bantuan Hukum) in your city.
          </p>
        </div>
      </main>
    </>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-extrabold"
            style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(96,165,250,0.40)', color: '#60A5FA' }}>
        {n}
      </span>
      <div className="flex-1">
        <div className="font-extrabold text-ink">{title}</div>
        <div className="text-muted mt-0.5">{children}</div>
      </div>
    </li>
  )
}

function PhoneRow({ num, label, plain }: { num: string; label: string; plain?: boolean }) {
  const tel = num.replace(/[^0-9]/g, '')
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      {plain
        ? <span className="font-extrabold text-ink">{num}</span>
        : <a href={`tel:${tel}`} className="font-extrabold text-brand">{num}</a>}
    </li>
  )
}
