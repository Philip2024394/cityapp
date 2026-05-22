import ClientAuthGuard from './ClientAuthGuard'

// ============================================================================
// /cari layout — vendor-only guard (client-side).
// ----------------------------------------------------------------------------
// Previously this layout used `force-dynamic` and ran getMyAccount() server
// side on every /cari/* navigation — two Supabase round-trips per nav. The
// guard now runs in <ClientAuthGuard> after mount, sharing one cached
// /api/me/account hit with the dashboard checks via fetchMyAccountCached.
//
// Trade-off: Rental Company accounts may see /cari content for a frame
// before the redirect fires. Personal + anonymous users (the 99% case)
// see no flash and the layout is fully cacheable.
// ============================================================================

export default function CariLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientAuthGuard />
      {children}
    </>
  )
}
