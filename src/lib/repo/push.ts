import { query, queryOne } from "../db";

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Saves (or re-assigns) a browser subscription to this user. */
export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent`,
    [input.userId, input.endpoint, input.p256dh, input.auth, input.userAgent]
  );
}

/** Removes a subscription, but only if it belongs to this user. */
export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [
    userId,
    endpoint,
  ]);
}

export async function deletePushSubscriptionById(id: string): Promise<void> {
  await query(`DELETE FROM push_subscriptions WHERE id = $1`, [id]);
}

export async function listPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  return query<PushSubscriptionRow>(
    `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
}

export async function markPushSubscriptionOk(id: string): Promise<void> {
  await query(`UPDATE push_subscriptions SET last_success_at = now() WHERE id = $1`, [id]);
}

export async function countPushSubscriptionsForUser(userId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  return parseInt(row?.count ?? "0", 10);
}

/**
 * Claims a dedupe key. Returns the log id when this alert has not been sent
 * before, or null when it already went out (so the caller skips it).
 */
export async function claimNotification(input: {
  userId: string;
  kind: string;
  dedupeKey: string;
  title: string;
  body: string;
  url: string | null;
}): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO notification_log (user_id, kind, dedupe_key, title, body, url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING id`,
    [input.userId, input.kind, input.dedupeKey, input.title, input.body, input.url]
  );
  return row?.id ?? null;
}

export async function setNotificationDelivered(id: string, delivered: number): Promise<void> {
  await query(`UPDATE notification_log SET delivered = $2 WHERE id = $1`, [id, delivered]);
}
