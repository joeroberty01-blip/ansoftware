import { query, queryOne, withTransaction } from "../db";
import { logAudit } from "../audit";
import type { MarSlot, MarStatus } from "../mar";
import type { PatientMedicationRow } from "../types";

export interface MarAdministrationRow {
  id: string;
  medication_id: string;
  patient_id: string;
  administration_date: string;
  slot: MarSlot;
  status: MarStatus;
  given_at: string | null;
  administered_by_id: string | null;
  administered_by_name: string | null;
  notes: string | null;
}

export interface MarDay {
  date: string;
  medications: PatientMedicationRow[];
  administrations: MarAdministrationRow[];
}

/** Today's calendar date in the clinic's timezone (YYYY-MM-DD). */
export async function clinicToday(): Promise<string> {
  const row = await queryOne<{ d: string }>(
    `SELECT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date::text AS d`
  );
  return row!.d;
}

export async function getMarDay(patientId: string, date: string): Promise<MarDay> {
  const medications = await query<PatientMedicationRow>(
    `SELECT * FROM patient_medications
     WHERE patient_id = $1
       AND (start_date IS NULL OR start_date <= $2::date)
       AND (end_date IS NULL OR end_date >= $2::date)
     ORDER BY created_at`,
    [patientId, date]
  );
  const administrations = await query<MarAdministrationRow>(
    `SELECT a.id, a.medication_id, a.patient_id, a.administration_date::text,
            a.slot, a.status, a.given_at, a.administered_by_id, a.notes,
            u.full_name AS administered_by_name
     FROM medication_administrations a
     LEFT JOIN users u ON u.id = a.administered_by_id
     WHERE a.patient_id = $1 AND a.administration_date = $2::date`,
    [patientId, date]
  );
  return { date, medications, administrations };
}

/** Per-day resolved-dose counts, newest first, for the history summary. */
export async function getMarHistory(
  patientId: string,
  days: number
): Promise<{ date: string; given: number; missed: number; refused: number }[]> {
  return query(
    `SELECT administration_date::text AS date,
            COUNT(*) FILTER (WHERE status = 'GIVEN')::int AS given,
            COUNT(*) FILTER (WHERE status = 'MISSED')::int AS missed,
            COUNT(*) FILTER (WHERE status = 'REFUSED')::int AS refused
     FROM medication_administrations
     WHERE patient_id = $1
       AND administration_date >= (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date - $2::int
     GROUP BY administration_date
     ORDER BY administration_date DESC`,
    [patientId, days]
  );
}

/**
 * Sets the outcome of one dose. `status: "PENDING"` clears a recorded dose
 * (the slot goes back to having no row). Throws MEDICATION_NOT_FOUND when the
 * medication is not this patient's, not active on `date`, or not scheduled
 * for `slot`.
 */
export async function recordAdministration(input: {
  patientId: string;
  medicationId: string;
  date: string;
  slot: MarSlot;
  status: MarStatus | "PENDING";
  givenTime: string | null;
  notes: string | null;
  userId: string;
}): Promise<void> {
  await withTransaction(async (client) => {
    const med = (
      await client.query<PatientMedicationRow>(
        `SELECT * FROM patient_medications
         WHERE id = $1 AND patient_id = $2
           AND (start_date IS NULL OR start_date <= $3::date)
           AND (end_date IS NULL OR end_date >= $3::date)`,
        [input.medicationId, input.patientId, input.date]
      )
    ).rows[0];
    if (!med) throw new Error("MEDICATION_NOT_FOUND");
    const scheduled = med.schedule_slots ?? [];
    if (scheduled.length > 0 && !scheduled.includes(input.slot)) {
      throw new Error("MEDICATION_NOT_FOUND");
    }

    if (input.status === "PENDING") {
      await client.query(
        `DELETE FROM medication_administrations
         WHERE medication_id = $1 AND administration_date = $2::date AND slot = $3`,
        [input.medicationId, input.date, input.slot]
      );
    } else {
      await client.query(
        `INSERT INTO medication_administrations
           (medication_id, patient_id, administration_date, slot, status,
            given_at, administered_by_id, notes)
         VALUES ($1, $2, $3::date, $4, $5,
           CASE WHEN $5 <> 'GIVEN' THEN NULL
                WHEN $6::text IS NOT NULL
                  THEN (($3::date + $6::time) AT TIME ZONE 'Africa/Dar_es_Salaam')
                WHEN $3::date = (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date
                  THEN now()
                ELSE NULL END,
           $7, $8)
         ON CONFLICT (medication_id, administration_date, slot) DO UPDATE SET
           status = EXCLUDED.status,
           given_at = EXCLUDED.given_at,
           administered_by_id = EXCLUDED.administered_by_id,
           notes = EXCLUDED.notes,
           updated_at = now()`,
        [
          input.medicationId,
          input.patientId,
          input.date,
          input.slot,
          input.status,
          input.givenTime,
          input.userId,
          input.notes,
        ]
      );
    }

    await logAudit(
      {
        userId: input.userId,
        action: "MAR_RECORDED",
        entity: "medication",
        entityId: input.medicationId,
        meta: {
          patientId: input.patientId,
          date: input.date,
          slot: input.slot,
          status: input.status,
        },
      },
      client
    );
  });
}
