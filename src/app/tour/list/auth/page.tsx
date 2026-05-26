import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogIn, UserPlus, ChevronRight, Compass } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getCurrentUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// /tour/list/auth
// ----------------------------------------------------------------------------
// Entry point for an UNAUTHENTICATED visitor who tapped "List a tour guide".
// Two choices: sign in to an existing account, or create a new one. Authed
// visitors skip straight to the form.
// ============================================================================

const NEXT = '/tour/list/new'

export default async function TourListAuthGatePage() {
  const user = await getCurrentUser()
  if (user) redirect(NEXT)

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-16">
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 space-y-6">
          <header className="text-center space-y-2">
            <div
              className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
              }}
            >
              <Compass className="w-7 h-7 text-bg" strokeWidth={2.5} />
            </div>
            <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-tight">
              List as <span className="gradient-text">Tour Guide</span>
            </h1>
            <p className="text-[13px] text-muted leading-snug">
              Pilih cara masuk untuk mulai listing kamu sebagai tour guide di IndoCity.
            </p>
          </header>

          <Link
            href={`/login?next=${encodeURIComponent(NEXT)}`}
            className="card p-5 flex items-center gap-3 active:scale-[0.99] transition"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
              }}
            >
              <LogIn className="w-5 h-5 text-bg" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-extrabold text-ink leading-tight">
                Saya sudah punya akun
              </div>
              <div className="text-[12px] text-muted mt-0.5">
                Login dengan email / WhatsApp lalu lanjut ke form listing.
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted shrink-0" />
          </Link>

          <Link
            href={`/signup?next=${encodeURIComponent(NEXT)}`}
            className="card p-5 flex items-center gap-3 active:scale-[0.99] transition"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
              }}
            >
              <UserPlus className="w-5 h-5 text-bg" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-extrabold text-ink leading-tight">
                Buat akun baru
              </div>
              <div className="text-[12px] text-muted mt-0.5">
                Daftar gratis. Sudah jadi IndoCity driver? Listing tour guide gratis.
                Kalau bukan driver, Rp 38.000/bulan untuk listing kamu.
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted shrink-0" />
          </Link>

          <div className="card p-4 space-y-2">
            <div className="text-[13px] font-extrabold text-ink">Quota listing</div>
            <ul className="text-[12px] text-muted leading-snug space-y-1">
              <li>• <span className="font-extrabold text-ink">Driver IndoCity aktif:</span> 1 listing tour guide gratis (sudah termasuk subscription Rp 38K/bulan kamu).</li>
              <li>• <span className="font-extrabold text-ink">Tour guide independen:</span> 1 listing, Rp 38.000/bulan atau Rp 350.000/tahun.</li>
              <li>• Pilih max 3 specialties (Temples, Beaches, Mountain, dll).</li>
            </ul>
          </div>
        </div>
      </main>
    </>
  )
}
