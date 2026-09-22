import { timingSafeEqual } from "node:crypto";

/**
 * Ulinzi wa miunganisho ya mashine (machine-to-machine).
 *
 * Kuna tofauti kubwa kati ya hii na `getCurrentUser()`. Ile inasoma
 * cookie ya session — ni ya mtu aliyeingia kwenye browser. Hii ni ya
 * server nyingine: app ya wateja ya Afya Nyumbani inapotuma booking,
 * hakuna browser wala cookie popote.
 *
 * Ufunguo mmoja tu, kutoka environment. Hakuna ruhusa nyingine
 * inayoambatana nayo: unaoweza kufanya ni kutengeneza booking, si
 * kusoma, si kufuta, si kuona chochote kingine.
 */

const HEADER = "x-api-key";

/**
 * Ulinganisho wa muda thabiti (constant time).
 *
 * `a === b` kwenye string husimama mara tu herufi zinapotofautiana, na
 * muda huo unaweza kumwambia mshambuliaji herufi ngapi za mwanzo
 * alizipata sahihi. Kwa ufunguo wa siri hilo ni tundu halisi.
 * `timingSafeEqual` huchukua muda uleule bila kujali.
 */
function equals(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // timingSafeEqual hutupa error kama urefu unatofautiana, na urefu
  // wenyewe si siri, hivyo hukaguliwa kwanza.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type IntegrationAuth =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function checkIntegrationKey(req: Request): IntegrationAuth {
  const expected = process.env.INTEGRATION_API_KEY;

  // Bila ufunguo kwenye environment, mlango huu umefungwa kabisa —
  // hauruhusu chochote. Ni muhimu isirudishe 401 hapa: 401 ingemaanisha
  // "ufunguo wako si sahihi", na ukweli ni kwamba huduma haijawekwa.
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "Muunganisho haujawekwa kwenye server hii.",
    };
  }

  const given = req.headers.get(HEADER);
  if (!given || !equals(given, expected)) {
    return { ok: false, status: 401, error: "Ufunguo si sahihi." };
  }

  return { ok: true };
}
