// /jeep — redirect to the unified marketplace filtered to jeep drivers.
//
// The standalone /jeep landing page that used to live here was not part
// of the designed marketplace. Jeep customers should land at /cari with
// the jeep vehicle filter applied — same pattern bike and car use.
// Profile-page back buttons now point to /cari?vehicle=jeep (see
// VehicleProfileShell chrome map). This redirect catches any direct
// /jeep visits + preserves any old external links.

import { redirect } from 'next/navigation'

export default function JeepRedirect(): never {
  redirect('/cari?vehicle=jeep')
}
