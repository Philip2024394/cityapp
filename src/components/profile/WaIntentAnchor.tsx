'use client'
// Tiny client island — wraps a wa.me anchor with onClick that fires the
// WhatsApp intent-intercept POST before the browser navigates. Used by
// server-rendered profile shells (RentalProfileShell, bus/[slug]) where
// adding onClick to the existing <a> would force the whole shell to be
// a client component.
//
// Renders as a same-shape anchor. Pass providerListingId (the row PK)
// and vertical; the route resolves to auth.users.id server-side.

import type { ReactNode } from 'react'
import { fireConnectIntent, type ConnectIntentSource, type ConnectIntentVertical } from '@/lib/connectIntent'

type Props = {
  href:        string
  providerId:  string
  vertical:    ConnectIntentVertical
  source:      ConnectIntentSource
  className?:  string
  style?:      React.CSSProperties
  children:    ReactNode
}

export default function WaIntentAnchor({
  href, providerId, vertical, source, className, style, children,
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={() => fireConnectIntent(providerId, source, vertical)}
    >
      {children}
    </a>
  )
}
