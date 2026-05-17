'use client'
import { idr } from '@/lib/format/idr'
import { SERVICE_ICONS, SERVICE_LABELS, type Rider } from '@/types/rider'

type Props = { rider: Rider; profileUrl: string }

// Visual: a credit-card-style "name card" with the rider's photo, services,
// price + a QR pointing to their public profile. Print via window.print().
// QR is fetched from qrserver.com — free, no API key, returns PNG.
export default function QRBusinessCard({ rider, profileUrl }: Props) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&color=0A0A0A&bgcolor=FACC15&data=${encodeURIComponent(profileUrl)}`
  return (
    <div className="bizcard">
      {/* Header strip */}
      <div className="bizcard-strip">
        <div className="bizcard-brand">
          <span className="bizcard-emoji">🛵</span>
          <span>
            City <span className="bizcard-gradient">Rider</span>
          </span>
        </div>
        <div className="bizcard-tag">{rider.city}</div>
      </div>

      <div className="bizcard-body">
        {/* Left column: photo + identity */}
        <div className="bizcard-left">
          <img src={rider.photoUrl} alt={rider.name} className="bizcard-photo" />
          <div className="bizcard-name">{rider.name}</div>
          <div className="bizcard-area">{rider.area}</div>

          <div className="bizcard-services">
            {rider.services.map(s => (
              <span key={s} className="bizcard-service">
                <span>{SERVICE_ICONS[s]}</span>
                <span>{SERVICE_LABELS[s].split(' ')[0]}</span>
              </span>
            ))}
          </div>

          <div className="bizcard-bike">
            <div className="bizcard-row">
              <span className="bizcard-row-label">Bike</span>
              <span className="bizcard-row-value">{rider.bike.make} {rider.bike.model} {rider.bike.year}</span>
            </div>
            <div className="bizcard-row">
              <span className="bizcard-row-label">Colour</span>
              <span className="bizcard-row-value">{rider.bike.color}</span>
            </div>
            {rider.bike.plate && (
              <div className="bizcard-row">
                <span className="bizcard-row-label">Plate</span>
                <span className="bizcard-row-value bizcard-mono">{rider.bike.plate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: price + QR + WhatsApp */}
        <div className="bizcard-right">
          <div className="bizcard-price-label">Courier rate</div>
          <div className="bizcard-price-row">
            <span className="bizcard-price-value">{idr(rider.pricePerKm)}</span>
            <span className="bizcard-price-unit">/km</span>
          </div>
          <div className="bizcard-min">min {idr(rider.minFee)}</div>

          <div className="bizcard-qr-wrap">
            <img src={qrSrc} alt="Profile QR" className="bizcard-qr" />
            <div className="bizcard-qr-cta">Scan for profile + booking</div>
          </div>

          <div className="bizcard-wa">
            <span className="bizcard-wa-icon">📱</span>
            <span className="bizcard-wa-num">+{rider.whatsappE164}</span>
          </div>

          <div className="bizcard-url">{profileUrl.replace(/^https?:\/\//, '')}</div>
        </div>
      </div>

      <style jsx>{`
        .bizcard {
          width: 100%; max-width: 560px; margin: 0 auto;
          background: #FACC15;
          color: #0A0A0A;
          border-radius: 22px;
          overflow: hidden;
          font-family: ui-sans-serif, system-ui, sans-serif;
          box-shadow: 0 20px 50px rgba(250,204,21,0.18), 0 0 0 1px rgba(0,0,0,0.04);
        }
        .bizcard-strip {
          background: #0A0A0A; color: #FACC15;
          padding: 14px 22px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .bizcard-brand {
          display: flex; align-items: center; gap: 8px;
          font-weight: 900; font-size: 18px; letter-spacing: -0.01em;
        }
        .bizcard-emoji { font-size: 22px; }
        .bizcard-gradient {
          background: linear-gradient(135deg, #FACC15, #FFFFFF);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .bizcard-tag {
          font-size: 13px; font-weight: 800;
          background: rgba(250,204,21,0.16);
          border: 1px solid rgba(250,204,21,0.4);
          color: #FACC15;
          padding: 4px 10px; border-radius: 9999px;
        }
        .bizcard-body {
          display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 18px;
          padding: 22px;
        }
        .bizcard-left { display: flex; flex-direction: column; gap: 10px; }
        .bizcard-photo {
          width: 92px; height: 92px; border-radius: 18px; object-fit: cover;
          border: 3px solid #0A0A0A;
        }
        .bizcard-name { font-size: 22px; font-weight: 900; line-height: 1.1; }
        .bizcard-area { font-size: 13px; font-weight: 700; color: rgba(10,10,10,0.7); margin-top: -4px; }
        .bizcard-services {
          display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;
        }
        .bizcard-service {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 9999px;
          background: #0A0A0A; color: #FACC15;
          font-size: 13px; font-weight: 800;
        }
        .bizcard-bike {
          margin-top: 6px; padding-top: 10px;
          border-top: 1.5px dashed rgba(10,10,10,0.18);
          display: flex; flex-direction: column; gap: 4px;
        }
        .bizcard-row {
          display: flex; align-items: baseline; justify-content: space-between;
          font-size: 13px; font-weight: 700;
        }
        .bizcard-row-label { color: rgba(10,10,10,0.55); text-transform: uppercase; letter-spacing: 0.04em; font-size: 13px; }
        .bizcard-row-value { color: #0A0A0A; font-weight: 800; font-size: 13px; }
        .bizcard-mono { font-family: ui-monospace, "SF Mono", monospace; }

        .bizcard-right {
          background: #0A0A0A; color: #FACC15;
          border-radius: 16px; padding: 14px;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .bizcard-price-label {
          font-size: 13px; font-weight: 800; color: rgba(250,204,21,0.6); text-transform: uppercase; letter-spacing: 0.06em;
        }
        .bizcard-price-row { display: flex; align-items: baseline; gap: 4px; }
        .bizcard-price-value { font-size: 30px; font-weight: 900; line-height: 1; color: #FACC15; }
        .bizcard-price-unit { font-size: 14px; font-weight: 800; color: rgba(250,204,21,0.65); }
        .bizcard-min { font-size: 13px; font-weight: 800; color: #FFFFFF; opacity: 0.55; }

        .bizcard-qr-wrap {
          margin-top: 8px;
          background: #FACC15; padding: 8px; border-radius: 14px;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .bizcard-qr { width: 132px; height: 132px; image-rendering: pixelated; display: block; }
        .bizcard-qr-cta { font-size: 13px; font-weight: 800; color: #0A0A0A; }

        .bizcard-wa {
          margin-top: 6px;
          display: flex; align-items: center; gap: 6px;
          font-size: 14px; font-weight: 800; color: #25D366;
        }
        .bizcard-wa-num { font-family: ui-monospace, monospace; }
        .bizcard-url {
          font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.55);
          word-break: break-all; text-align: center;
        }

        @media (max-width: 480px) {
          .bizcard-body { grid-template-columns: 1fr; }
          .bizcard-photo { width: 72px; height: 72px; }
          .bizcard-name { font-size: 20px; }
        }
      `}</style>
    </div>
  )
}
