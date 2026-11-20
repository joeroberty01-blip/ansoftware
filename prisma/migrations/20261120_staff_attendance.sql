-- Staff attendance: check in on arrival at a patient's home and check out
-- on leaving, each with GPS (and a selfie on check-in), compared with the
-- patient's saved home location.
-- Additive and idempotent: safe to run more than once; changes no existing rows.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS home_lat DECIMAL(9,6);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS home_lng DECIMAL(9,6);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS home_location_set_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS home_location_set_by TEXT REFERENCES users(id);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id               TEXT NOT NULL REFERENCES staff(id),
  patient_id             TEXT REFERENCES patients(id),
  work_date              DATE NOT NULL,
  check_in_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_in_lat           DECIMAL(9,6) NOT NULL,
  check_in_lng           DECIMAL(9,6) NOT NULL,
  check_in_accuracy_m    DECIMAL(8,2),
  check_in_distance_m    INT,
  late_minutes           INT NOT NULL DEFAULT 0,
  check_out_at           TIMESTAMPTZ,
  check_out_lat          DECIMAL(9,6),
  check_out_lng          DECIMAL(9,6),
  check_out_accuracy_m   DECIMAL(8,2),
  check_out_distance_m   INT,
  user_agent             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance(staff_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(work_date DESC);
-- At most one open shift per staff member.
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_attendance_open
  ON staff_attendance(staff_id) WHERE check_out_at IS NULL;

-- Check-in selfies, kept apart so attendance lists stay light.
CREATE TABLE IF NOT EXISTS staff_attendance_photos (
  attendance_id  TEXT PRIMARY KEY REFERENCES staff_attendance(id),
  mime           TEXT NOT NULL,
  data           BYTEA NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
