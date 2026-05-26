-- ============================================================================
-- 0010_remove_trips_workflow.sql
-- ----------------------------------------------------------------------------
-- Strip the dispatch / trip-lifecycle tables.
--
-- WHY: IndoCity is a software listing directory, NOT a ride-hailing
-- operator under Permenhub PM 12/2019. The trips + trip_events tables
-- and their Realtime channel were the one piece of the schema that
-- materially crossed the line into "aplikasi penyedia jasa angkutan"
-- territory because they tracked the full trip lifecycle on platform
-- servers (requested → accepted → in_trip → completed). Removing them
-- keeps the platform on the directory side of the classification
-- test, with all booking handoffs going through WhatsApp deep-links
-- with no platform-side record.
--
-- After this migration:
--   * Customers tap "Book Driver" → opens wa.me/<rider_phone> directly.
--     Platform never sees the booking and never records it.
--   * Riders are independent businesses; the dashboard is a profile +
--     subscription + analytics tool, not a dispatch console.
--   * Drivers still set their own price_per_km on their listing — but
--     it's just price display on a directory card, like an OLX listing.
-- ============================================================================

-- Drop dependent objects first (Realtime publications, RLS policies,
-- indexes, triggers) by dropping the table with CASCADE. trip_events
-- has FK to trips so CASCADE handles it in one shot.
DROP TABLE IF EXISTS public.trip_events CASCADE;
DROP TABLE IF EXISTS public.trips        CASCADE;

-- Drop any enum types that were exclusive to the trip workflow. Keep
-- shared ones (service_type, payment_method) since they're still used
-- by /cari for client-side price quoting.
DROP TYPE IF EXISTS public.trip_status   CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
