'use client'
import { useState } from 'react'
import { Mail, Send, Check, AlertCircle } from 'lucide-react'

// Public-profile contact form (mig 0137). Renders as a sibling card
// directly below VisitUsPanel when the provider has opted in via the
// dashboard /info "Contact form" Card. Three fields — name, sender
// email, message — POSTs to the vertical's contact endpoint, which
// stores the submission in contact_messages and sends a Resend
// notification email to the provider's contact_email.

export type ContactFormPanelProps = {
  displayName: string
  themeColor:  string
  /** Vertical-specific POST endpoint, e.g. `/api/beautician/contact`. */
  endpoint:    string
  /** Provider ID stored on the submission — the endpoint uses the
   *  vertical+slug from its own URL params to look this up, but the
   *  client can pass it to surface validation errors earlier. */
  providerSlug: string
}

type SendState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string }

const NAME_MAX    = 80
const MSG_MAX     = 4000
const EMAIL_RE    = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function ContactFormPanel({
  displayName, themeColor, endpoint, providerSlug,
}: ContactFormPanelProps) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState('')
  const [state,   setState]   = useState<SendState>({ kind: 'idle' })

  const valid =
    name.trim().length >= 1 && name.trim().length <= NAME_MAX
    && EMAIL_RE.test(email.trim())
    && message.trim().length >= 1 && message.trim().length <= MSG_MAX

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || state.kind === 'sending') return
    setState({ kind: 'sending' })
    try {
      const r = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          slug:         providerSlug,
          sender_name:  name.trim(),
          sender_email: email.trim(),
          message:      message.trim(),
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const err = j?.error === 'rate_limited'
          ? 'Too many messages from your network — try again in an hour.'
          : 'Could not send your message. Please try again or contact via WhatsApp.'
        setState({ kind: 'error', message: err })
        return
      }
      setState({ kind: 'sent' })
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setState({ kind: 'error', message: 'Network error. Please try again or contact via WhatsApp.' })
    }
  }

  if (state.kind === 'sent') {
    return (
      <section className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" strokeWidth={3} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-extrabold text-emerald-800">Message sent</div>
            <p className="text-[12px] text-emerald-700 leading-snug mt-0.5">
              {displayName} usually replies within a day. Check your inbox for a reply at the email you provided.
            </p>
            <button
              type="button"
              onClick={() => setState({ kind: 'idle' })}
              className="text-[12px] font-bold text-emerald-700 underline mt-2"
            >
              Send another message
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 shrink-0" style={{ color: themeColor }} strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold text-black">Send a message</div>
          <p className="text-[12px] text-gray-600 leading-snug">
            Your email goes only to {displayName}. No spam, no list.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder="Your name"
          className={inputCls}
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={inputCls}
          required
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MSG_MAX}
          rows={4}
          placeholder={`Hi ${displayName.split(' ')[0]}, I'd like to ask about…`}
          className={inputCls + ' resize-y leading-relaxed min-h-[88px]'}
          required
        />
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[12px] tabular-nums ${message.length >= MSG_MAX - 100 ? 'text-amber-600' : 'text-gray-500'}`}>
            {message.length} / {MSG_MAX}
          </span>
          <button
            type="submit"
            disabled={!valid || state.kind === 'sending'}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white text-[13px] font-extrabold uppercase tracking-wider shadow-sm shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition min-h-[44px]"
            style={{ background: themeColor }}
          >
            <Send className="w-4 h-4" strokeWidth={2.5} />
            {state.kind === 'sending' ? 'Sending…' : 'Send message'}
          </button>
        </div>
        {state.kind === 'error' && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[12px] text-rose-700 leading-snug">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.5} />
            <span>{state.message}</span>
          </div>
        )}
      </form>
    </section>
  )
}

const inputCls = 'w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/35 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100'
