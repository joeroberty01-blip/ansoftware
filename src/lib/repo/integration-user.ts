import { randomUUID } from "node:crypto";
import { queryOne } from "../db";
import { hashPassword } from "../auth";
import type { UserRow } from "../types";

/**
 * Mtumiaji anayemiliki bookings zinazotoka kwenye app ya wateja.
 *
 * Jedwali la `bookings` lina `created_by_id TEXT NOT NULL REFERENCES
 * users(id)` — kila booking lazima iwe na aliyeitengeneza. Booking
 * inayotoka kwenye app haina mtu; inatoka kwenye mfumo. Njia mbili
 * zilikuwepo: kuifanya safu hiyo ikubali NULL, au kuwa na mtumiaji
 * mmoja anayewakilisha mfumo.
 *
 * Mtumiaji ndiyo njia iliyochaguliwa, kwa sababu hairuhusu kubadilisha
 * schema na — muhimu zaidi — ukurasa wa bookings unaonyesha jina la
 * aliyeitengeneza. Ukiona "Afya Nyumbani App", unajua ilitoka wapi.
 * NULL ingekuwa nafasi tupu isiyoeleza kitu.
 *
 * Hawezi kuingia kamwe:
 *   - role STAFF, si ADMIN — asipate ruhusa asizozihitaji
 *   - status SUSPENDED — hata njia za kawaida zingemkataa
 *   - password_hash ni ya maneno ya bahati nasibu asiyoyajua mtu
 *
 * Pia haonekani popote kwenye UI: `listPendingStaff` huchuja STAFF
 * zenye status PENDING, na `countAdmins` huhesabu ADMIN pekee.
 */

const INTEGRATION_EMAIL = "app-integration@afyanyumbani.local";
const INTEGRATION_NAME = "Afya Nyumbani App";

export async function ensureIntegrationUser(): Promise<UserRow> {
  const existing = await queryOne<UserRow>(
    `SELECT * FROM users WHERE email = $1`,
    [INTEGRATION_EMAIL]
  );
  if (existing) return existing;

  // Nenosiri lisilojulikana na yeyote, hata mimi. Halihifadhiwi
  // popote — linatengenezwa, linachanganywa, kisha linasahaulika.
  const unusable = await hashPassword(`${randomUUID()}${randomUUID()}`);

  const created = await queryOne<UserRow>(
    `INSERT INTO users (email, password_hash, full_name, phone, role, status)
     VALUES ($1, $2, $3, $4, 'STAFF', 'SUSPENDED')
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [INTEGRATION_EMAIL, unusable, INTEGRATION_NAME, ""]
  );

  // ON CONFLICT hapo juu ni kwa ajili ya maombi mawili yanayofika kwa
  // wakati mmoja: booking mbili za kwanza kabisa zingejaribu
  // kumtengeneza mtumiaji yuleyule, na moja ingeshindwa.
  if (!created) throw new Error("Imeshindwa kuandaa mtumiaji wa muunganisho");
  return created;
}
