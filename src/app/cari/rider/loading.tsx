export default function Loading() {
  return (
    <main className="min-h-screen px-4 pt-6" style={{ background: '#0A0A0A' }}>
      <div className="max-w-xl mx-auto space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)', height: 180 }}
          />
        ))}
      </div>
    </main>
  )
}
