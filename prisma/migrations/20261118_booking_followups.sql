-- Lead follow-up for bookings: where each request came from, when to
-- contact it next, and a log of every call or message.
-- Idempotent: safe to run more than once.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;

CREATE INDEX IF NOT EXISTS idx_bookings_follow_up
  ON bookings(next_follow_up_date)
  WHERE status IN ('NEW', 'ASSIGNED');

CREATE TABLE IF NOT EXISTS booking_followups (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  booking_id           TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  channel              TEXT NOT NULL,
  note                 TEXT NOT NULL,
  next_follow_up_date  DATE,
  created_by_id        TEXT NOT NULL REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_followups_booking
  ON booking_followups(booking_id, created_at DESC);
