-- ============================================================================
-- Enable Supabase Realtime on tables that drive cross-device UI
-- ============================================================================
-- Customer and driver browsers subscribe to changes on these tables to keep
-- the booking flow live. RLS policies still apply to subscriptions — a
-- subscriber only receives rows they're allowed to SELECT.
--
-- The `supabase_realtime` publication is the default channel name.
-- ============================================================================

-- Trips: customer subscribes to "their" trip row to see accept/decline/etc.
-- Driver subscribes to inserts where driver_id = self for incoming bookings.
alter publication supabase_realtime add table public.trips;

-- Trip events: future use for richer telemetry (driver location at key
-- moments, photo proofs, etc.). Cheap to enable now.
alter publication supabase_realtime add table public.trip_events;

-- Drivers: customer's tracking page subscribes to the driver's
-- current_lat / current_lng for live location while a trip is in progress.
alter publication supabase_realtime add table public.drivers;
