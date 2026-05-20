import Link from 'next/link'
import { ChevronLeft, Mail, MessageCircle, Shield, AlertCircle } from 'lucide-react'
import { getLegalEntity } from '@/lib/legal/entity'

// ============================================================================
// /contact — the canonical contact entry point. Required by UU PDP for
// data-subject requests (access / correct / delete / portability) and by
// the About + Privacy pages which link here.
//
// Three channels, ranked by formality:
//   1. Email — for legal / DSR / business inquiries
//   2. WhatsApp — for general support
//   3. Address (if a registered legal entity exists) — for postal notices
// ============================================================================

export const metadata = {
  title: 'Contact · City Rider',
  description: 'Get in touch with City Rider — data requests, support, business inquiries.',
}

// Fallback contacts when no env-configured legal entity is set. These
// route to the operator's working channels so the page is never empty.
const FALLBACK_EMAIL    = 'streetlocallive@gmail.com'
const FALLBACK_WHATSAPP = ''  // optional — leave blank if no support number yet

export default function ContactPage() {
  const entity = getLegalEntity()
  const email    = entity.contactEmail    ?? FALLBACK_EMAIL
  const whatsapp = entity.contactWhatsapp ?? FALLBACK_WHATSAPP

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 glass-strong pt-safe">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-[13px] font-bold text-muted hover:text-ink flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold">Contact</h1>
          <p className="text-muted text-[14px] mt-2 leading-relaxed">
            Get in touch about your account, data requests under UU PDP, or general questions
            about the platform.
          </p>
        </div>

        {/* Primary — email for formal / legal / DSR */}
        <a
          href={`mailto:${email}?subject=City%20Rider%20-%20`}
          className="card card-interactive p-5 flex items-start gap-4"
          style={{ background: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.30)' }}
        >
          <div className="w-11 h-11 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-brand" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
              Email (formal + data requests)
            </div>
            <div className="font-extrabold text-[15px] mt-0.5 break-all">{email}</div>
            <div className="text-[13px] text-muted mt-1 leading-relaxed">
              Use this for UU PDP data-subject requests (access, correct, delete, export),
              billing questions, legal matters, or business inquiries. We respond within 14 days
              for DSRs and within 3 working days for everything else.
            </div>
          </div>
        </a>

        {/* WhatsApp — only render if a support number is configured */}
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="card card-interactive p-5 flex items-start gap-4"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(37,211,102,0.20), rgba(18,140,126,0.10))',
                border: '1px solid rgba(37,211,102,0.30)',
              }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: '#25D366' }} strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
                WhatsApp (general support)
              </div>
              <div className="font-extrabold text-[15px] mt-0.5">+{whatsapp}</div>
              <div className="text-[13px] text-muted mt-1 leading-relaxed">
                Quick questions, account help, marketplace issues. Mon–Sat 09:00–18:00 WIB.
              </div>
            </div>
          </a>
        )}

        {/* Data-subject-request explainer */}
        <section className="card p-5 space-y-3 text-[14px] leading-relaxed text-ink/90">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand" />
            <h2 className="font-extrabold text-[16px]">Data-subject requests (UU PDP)</h2>
          </div>
          <p>
            Under Indonesia&apos;s UU 27/2022 you have the right to access, correct, delete,
            restrict, port, or withdraw consent for your personal data. To file a request,
            email <a href={`mailto:${email}`} className="text-brand hover:underline">{email}</a>{' '}
            with the subject line <strong className="text-ink">&quot;UU PDP request&quot;</strong>{' '}
            and include:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your full name and WhatsApp number on the account</li>
            <li>The type of request (access / correct / delete / export / withdraw)</li>
            <li>Any specific data fields you&apos;re asking about</li>
          </ul>
          <p>
            We respond within <strong className="text-ink">14 calendar days</strong>. Identity
            verification may be required for sensitive requests.
          </p>
          <p className="text-muted text-[13px]">
            If your request isn&apos;t resolved to your satisfaction you may escalate to{' '}
            <em>Lembaga Pelindungan Data Pribadi</em>.
          </p>
        </section>

        {/* Postal address — only render if a registered entity address is configured */}
        {entity.address && (
          <section className="card p-5 space-y-2 text-[14px] leading-relaxed text-ink/90">
            <h2 className="font-extrabold text-[16px]">Registered address</h2>
            {entity.name && <p className="font-bold text-ink">{entity.name}</p>}
            <p className="whitespace-pre-line">{entity.address}</p>
            {entity.npwp && <p className="text-muted text-[13px]">NPWP: {entity.npwp}</p>}
            {entity.pseNumber && (
              <p className="text-muted text-[13px]">PSE Privat: {entity.pseNumber}</p>
            )}
          </section>
        )}

        {/* Honest note if no registered entity yet — keeps the page honest
            rather than implying a corporate structure that doesn't exist. */}
        {!entity.address && (
          <div
            className="card p-4 flex gap-3 text-[13px]"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <AlertCircle className="w-4 h-4 text-muted shrink-0 mt-0.5" />
            <div className="text-muted leading-relaxed">
              City Rider operates as part of the StreetLocal family of apps from Yogyakarta,
              Indonesia. For formal correspondence, use the email above.
            </div>
          </div>
        )}
      </article>
    </main>
  )
}
