export default function Loading() {
  return (
    <main className="min-h-screen px-4 pt-6" style={{ background: '#0A0A0A' }}>
      <div className="max-w-xl mx-auto space-y-3">
        <div className="rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', height: 260 }} />
        <div className="rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', height: 120 }} />
        <div className="rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', height: 80 }} />
      </div>
    </main>
  )
}
