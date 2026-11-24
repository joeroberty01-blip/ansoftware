-- Part-time visits: who visited which patient as part-time cover, and why.
-- The person is either an ERP staff member (staff_id) or someone from
-- outside the ERP (external_name). Records are never deleted: a wrong one is
-- cancelled (voided_*) and stays on file.
-- Additive and idempotent: safe to run more than once; changes no existing rows.

CREATE TABLE IF NOT EXISTS part_time_visits (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id          TEXT REFERENCES staff(id),
  external_name     TEXT,
  external_phone    TEXT,
  patient_id        TEXT NOT NULL REFERENCES patients(id),
  visit_date        DATE NOT NULL,
  start_time        TIME,
  end_time          TIME,
  reason            TEXT NOT NULL,
  reason_note       TEXT,
  covered_staff_id  TEXT REFERENCES staff(id),
  notes             TEXT,
  voided_at         TIMESTAMPTZ,
  voided_by_id      TEXT REFERENCES users(id),
  void_reason       TEXT,
  created_by_id     TEXT NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((staff_id IS NULL) <> (external_name IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_part_time_visits_date ON part_time_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_part_time_visits_staff ON part_time_visits(staff_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_part_time_visits_patient ON part_time_visits(patient_id, visit_date DESC);
