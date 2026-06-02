// Minimal loading shell for the /cari/rider redirect. The page itself is
// a server-side `redirect()` so this rarely renders, but Next still
// requires a valid loading boundary alongside any async server page.
export default function Loading() {
  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: '#FFFFFF' }}
      aria-label="Redirecting"
    >
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{
          border: '3px solid rgba(250,204,21,0.35)',
          borderTopColor: '#FACC15',
        }}
      />
    </main>
  )
}
