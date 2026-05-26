import Link from 'next/link'
import { ChevronLeft, Siren, Phone, FileText, AlertCircle } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

// ============================================================================
// /dashboard/legal/accident
// ----------------------------------------------------------------------------
// Pocket reference for what to do in the worst case. Static guidance,
// no DB. Drivers should bookmark this from /dashboard/legal so it
// loads even on poor signal.
//
// Content based on Jasa Raharja claim procedure (UU 33/1964 + UU
// 34/1964), BPJS Ketenagakerjaan JKK claim flow (PP 44/2015), and
// standard Indonesian post-accident protocol.
// ============================================================================

export const metadata = {
  title: 'In case of accident · IndoCity',
}

export default function AccidentPage() {
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
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)' }}
              >
                <Siren className="w-4 h-4" style={{ color: '#EF4444' }} />
              </div>
              <h1 className="text-2xl font-extrabold">In case of accident</h1>
            </div>
            <p className="text-muted text-[14px] leading-snug">
              Practical first-hour protocol. Keep this page bookmarked.
            </p>
          </header>

          {/* Right now */}
          <section className="card p-4 space-y-3">
            <h2 className="text-[14px] font-extrabold flex items-center gap-2" style={{ color: '#EF4444' }}>
              <AlertCircle className="w-4 h-4" />
              Right now (first 10 minutes)
            </h2>
            <ol className="space-y-3 text-[13px] leading-snug">
              <Step n={1} title="Move to safety">
                If you can ride, move bike and yourself off the road. If not, switch on hazards
                or wave traffic away. Don&apos;t leave the scene.
              </Step>
              <Step n={2} title="Check for injuries">
                Yours first, then any other party. If anyone is unconscious or bleeding heavily,
                call <a href="tel:118" className="text-brand font-extrabold">118</a> ambulance immediately.
              </Step>
              <Step n={3} title="Call police">
                Call <a href="tel:110" className="text-brand font-extrabold">110</a>. Tell them
                location + injuries. Police must attend if there&apos;s injury or significant
                damage — this is also what triggers your Jasa Raharja eligibility.
              </Step>
              <Step n={4} title="Photograph everything">
                Bike position before anything moves. Damage to both vehicles. Plates. Road conditions.
                Other driver&apos;s licence + STNK + KTP if they&apos;ll let you. Witnesses&apos; numbers.
              </Step>
              <Step n={5} title="Don't sign or admit fault">
                Don&apos;t agree to liability at the scene. Don&apos;t sign anything the other driver
                hands you. Let the police report decide.
              </Step>
            </ol>
          </section>

          {/* Within 72 hours */}
          <section className="card p-4 space-y-3">
            <h2 className="text-[14px] font-extrabold">Within 72 hours</h2>
            <ol className="space-y-3 text-[13px] leading-snug">
              <Step n={6} title="Get the police report (Laporan Polisi)">
                Visit the nearest Polsek/Polres. Bring KTP, SIM C, STNK. Free of charge. The
                <strong className="text-ink"> Laporan Polisi number</strong> is required for both Jasa Raharja and BPJS claims.
              </Step>
              <Step n={7} title="File the Jasa Raharja claim">
                If you or any party was injured, call
                <a href="tel:1500020" className="text-brand font-extrabold"> 1500-020 </a>
                (Jasa Raharja Call Center). Bring: Laporan Polisi, medical receipts, KTP, KK,
                death certificate (if fatal). Coverage: medical up to Rp 20M, death Rp 50M
                (per UU 33-34/1964 + Permenkeu).
              </Step>
              <Step n={8} title="If you have BPJS Kesehatan">
                Outpatient/inpatient care at a partner hospital is covered. Bring KTP + BPJS card
                + Laporan Polisi (some hospitals require it for traffic-accident cases).
              </Step>
              <Step n={9} title="If you have BPJS Ketenagakerjaan (JKK)">
                As a registered BPU member, file Jaminan Kecelakaan Kerja claim within 2x24 hours
                of the accident. Call
                <a href="tel:175" className="text-brand font-extrabold"> 175 </a>
                or visit the nearest BPJS TK office. Pays for medical + loss of income.
              </Step>
              <Step n={10} title="Notify IndoCity — operational only">
                Send a brief WhatsApp to IndoCity support so we know you may be offline.
                Note: we have no liability for the incident itself, but we can pause your
                profile so customers see you&apos;re unavailable.
              </Step>
            </ol>
          </section>

          {/* Numbers */}
          <section className="card p-4 space-y-2">
            <h2 className="text-[14px] font-extrabold flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand" />
              Emergency numbers
            </h2>
            <ul className="text-[13px] space-y-1.5">
              <PhoneRow num="118" label="Ambulance" />
              <PhoneRow num="110" label="Polri emergency" />
              <PhoneRow num="113" label="Damkar (fire / rescue)" />
              <PhoneRow num="1500-020" label="Jasa Raharja claim line" />
              <PhoneRow num="175" label="BPJS Ketenagakerjaan / 165 BPJS Kesehatan" />
              <PhoneRow num="115" label="Basarnas (search & rescue)" />
            </ul>
          </section>

          {/* What Jasa Raharja covers */}
          <section className="card p-4 space-y-2">
            <h2 className="text-[14px] font-extrabold flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              What Jasa Raharja covers (per accident victim)
            </h2>
            <ul className="text-[13px] text-ink/85 space-y-1.5 leading-snug">
              <li>• <strong className="text-ink">Medical:</strong> up to Rp 20.000.000</li>
              <li>• <strong className="text-ink">Death:</strong> Rp 50.000.000 to heirs</li>
              <li>• <strong className="text-ink">Permanent disability:</strong> up to Rp 50.000.000</li>
              <li>• <strong className="text-ink">Funeral cost:</strong> Rp 4.000.000</li>
              <li>• <strong className="text-ink">Ambulance:</strong> Rp 500.000</li>
            </ul>
            <p className="text-[11px] text-dim mt-2 leading-snug">
              You contribute to Jasa Raharja automatically when you pay PKB (Sumbangan Wajib
              Dana Kecelakaan Lalu Lintas Jalan). Coverage applies regardless of fault, as long
              as you have a valid SIM C and active STNK at the time of the accident.
            </p>
          </section>

          <p className="text-[11px] text-dim leading-snug">
            IndoCity is a directory of independent riders. We are not a party to your
            accident or its insurance claim. This page is practical guidance — for legal
            representation contact a lawyer or LBH (Lembaga Bantuan Hukum).
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
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)', color: '#EF4444' }}>
        {n}
      </span>
      <div className="flex-1">
        <div className="font-extrabold text-ink">{title}</div>
        <div className="text-muted mt-0.5">{children}</div>
      </div>
    </li>
  )
}

function PhoneRow({ num, label }: { num: string; label: string }) {
  const tel = num.replace(/[^0-9]/g, '')
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <a href={`tel:${tel}`} className="font-extrabold text-brand">{num}</a>
    </li>
  )
}
