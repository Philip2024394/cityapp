import OutreachClient from './OutreachClient'

// Admin → Outreach CRM. Sales tool, not a scraper. Solo-founder
// workflow: search Google Maps → enter shops into pipeline →
// copy template message → send WhatsApp → mark contacted.

export const metadata = { title: 'Outreach · Admin' }
export const dynamic = 'force-dynamic'

export default function OutreachAdminPage() {
  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-[22px] font-extrabold leading-tight">Outreach</h1>
        <p className="text-[12px] text-muted mt-1">
          Sales pipeline for cold-WhatsApp outreach. Find leads on Google Maps,
          copy a template, mark status. Conversion data lives in your DB.
        </p>
      </header>
      <OutreachClient />
    </div>
  )
}
