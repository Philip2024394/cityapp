import Link from 'next/link'
import { ChevronLeft, Mail, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react'

// ============================================================================
// /account/delete — PUBLIC page (no auth required).
// ----------------------------------------------------------------------------
// Required by Google Play Store: every app that creates accounts must
// provide a publicly-reachable URL describing the deletion process — for
// users who have lost access to their account / phone / app.
//
// Two paths described:
//   1. Signed-in deletion via Dashboard → Settings → Delete my account
//   2. Email-driven deletion for users locked out — processed within 14 days
//      per UU 27/2022.
// ============================================================================

export const metadata = {
  title: 'Delete your account · IndoCity',
  description: 'How to permanently delete your IndoCity account, profile, and data.',
}

export default function AccountDeletePage() {
  return (
    <main className="min-h-[100dvh] pb-16">
      <header className="sticky top-0 z-40 glass-strong pt-safe">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-[13px] font-bold text-muted hover:text-ink flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            <Trash2 className="w-6 h-6" style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">Delete your account</h1>
            <p className="text-muted text-[13px] mt-0.5">
              Permanent removal of your profile and data.
            </p>
          </div>
        </div>

        {/* WARNING */}
        <section
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)' }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
          <div className="text-[13px] leading-relaxed text-ink/90">
            <strong className="text-ink">This is permanent.</strong> Once deleted, your driver
            profile, listings, push tokens, subscription, and your authored reviews are
            irreversibly removed. We cannot restore the account afterwards.
          </div>
        </section>

        {/* OPTION 1 — in-app */}
        <section className="card p-5 space-y-2.5">
          <h2 className="font-extrabold text-[16px]">If you can still sign in</h2>
          <ol className="list-decimal list-inside space-y-1 text-[14px] leading-relaxed text-ink/90">
            <li>Open the IndoCity app or visit <Link href="/login" className="text-brand hover:underline">/login</Link> in a browser</li>
            <li>Sign in to your account</li>
            <li>Go to <Link href="/dashboard" className="text-brand hover:underline">Dashboard</Link></li>
            <li>Scroll to the bottom and tap <strong className="text-ink">&quot;Delete my account&quot;</strong></li>
            <li>Type <code className="px-1.5 py-0.5 rounded bg-white/5 text-brand text-[12px] font-mono">DELETE</code> to confirm</li>
          </ol>
          <p className="text-[12px] text-muted pt-1">
            Deletion is processed immediately. You will be signed out and the account is gone.
          </p>
        </section>

        {/* OPTION 2 — email */}
        <section className="card p-5 space-y-2.5">
          <h2 className="font-extrabold text-[16px]">If you have lost access</h2>
          <p className="text-[14px] leading-relaxed text-ink/90">
            If you cannot sign in (lost phone, forgotten password, etc.), email us from the
            email address registered to your account:
          </p>
          <a
            href="mailto:streetlocallive@gmail.com?subject=Account%20deletion%20request&body=Please%20delete%20my%20City%20Rider%20account.%20My%20registered%20email%20is%3A%20%5Byour%20email%5D%2C%20WhatsApp%20number%3A%20%5Byour%20number%5D."
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-[14px] text-bg bg-gradient-to-r from-brand to-brand2 active:scale-95 transition"
            style={{ minHeight: 44 }}
          >
            <Mail className="w-4 h-4" />
            Email streetlocallive@gmail.com
          </a>
          <p className="text-[12px] text-muted">
            Include your registered email and WhatsApp number. We respond within{' '}
            <strong className="text-ink/80">14 days</strong> per UU 27/2022 (Indonesia PDP).
          </p>
        </section>

        {/* WHAT GETS DELETED */}
        <section className="card p-5 space-y-2 text-[14px] leading-relaxed text-ink/90">
          <h2 className="font-extrabold text-[16px]">What gets removed</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Authentication record (you cannot sign in again)</li>
            <li>Driver profile + public listing on the directory</li>
            <li>Bike rental listings you own</li>
            <li>Active subscription (no refund for the current period)</li>
            <li>Push notification tokens for every device you registered</li>
            <li>Contact-tap analytics tied to your account</li>
            <li>Reviews you authored on other drivers</li>
            <li>Personal fields (name, WhatsApp number, photo, bio, GPS location)</li>
          </ul>
        </section>

        {/* WHAT STAYS */}
        <section className="card p-5 space-y-2 text-[14px] leading-relaxed text-ink/90">
          <h2 className="font-extrabold text-[16px]">What stays (and why)</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong className="text-ink">Reviews written about you</strong> by other users —
              your profile is anonymised to &quot;[deleted account]&quot; so they remain attached
              to the public record but no longer identify you.
            </li>
            <li>
              <strong className="text-ink">Aggregated platform analytics</strong> (zone demand,
              total trip counts) — anonymised, used for marketplace operations.
            </li>
            <li>
              <strong className="text-ink">Tax records</strong> we are legally required to keep
              (PPh, PPN — typically 10 years under Indonesian tax law).
            </li>
          </ul>
        </section>

        {/* DATA RIGHTS */}
        <section className="card p-5 space-y-2 text-[14px] leading-relaxed text-ink/90">
          <h2 className="font-extrabold text-[16px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand" /> Your rights under UU PDP
          </h2>
          <p>
            Before deleting, you may request a copy of your data (right to portability) or
            correction of inaccurate data. See our{' '}
            <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>{' '}
            for the full list of rights and how to exercise them.
          </p>
        </section>
      </article>
    </main>
  )
}
