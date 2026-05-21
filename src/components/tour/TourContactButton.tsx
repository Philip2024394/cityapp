'use client'
import { MessageCircle } from 'lucide-react'
import { trackWaClick } from '@/lib/tracking/waClick'

// Small client wrapper so /tour/[slug] (a server component) can fire
// trackWaClick on the WhatsApp Contact button without becoming a client
// component itself.
export default function TourContactButton({
  href, phone, listingId, name, label = 'Contact',
}: {
  href: string
  phone: string
  listingId: string
  name: string
  label?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWaClick({ context: 'tour_guide_detail', targetPhone: phone, meta: { listing_id: listingId } })}
      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-bg font-extrabold text-[12px] uppercase tracking-wider active:scale-95 transition"
      style={{
        background: 'linear-gradient(135deg, #FACC15, #EAB308)',
        border: '1px solid rgba(0,0,0,0.85)',
        boxShadow: '0 4px 12px rgba(250,204,21,0.30)',
        minHeight: 40,
      }}
      aria-label={`WhatsApp ${name}`}
    >
      <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
      {label}
    </a>
  )
}
