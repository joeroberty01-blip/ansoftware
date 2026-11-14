import "server-only";
import webpush from "web-push";
import {
  claimNotification,
  deletePushSubscriptionById,
  listPushSubscriptionsForUser,
  markPushSubscriptionOk,
  setNotificationDelivered,
} from "./repo/push";

export interface PushPayload {
  title: string;
  body: string;
  /** Page to open when the notification is tapped. */
  url?: string;
  /** Same tag replaces an older notification instead of stacking. */
  tag?: string;
}

let configured: boolean | null = null;

/** True when the VAPID keys are set; configures web-push once. */
export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:afyanyumbanicare@gmail.com",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

/**
 * Sends to every device this user enabled. Devices the push service says are
 * gone (404/410) are removed. Returns how many devices accepted it.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  const subs = await listPushSubscriptionsForUser(userId);
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    tag: payload.tag,
  });

  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 6, urgency: "high" }
        );
        delivered += 1;
        await markPushSubscriptionOk(sub.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deletePushSubscriptionById(sub.id);
        } else {
          console.error("[push] send failed:", status ?? err);
        }
      }
    })
  );
  return delivered;
}

/**
 * Sends an alert at most once per dedupeKey and records it in
 * notification_log. Returns null when it had already been sent.
 */
export async function notifyOnce(input: {
  userId: string;
  kind: string;
  dedupeKey: string;
  payload: PushPayload;
}): Promise<number | null> {
  const logId = await claimNotification({
    userId: input.userId,
    kind: input.kind,
    dedupeKey: input.dedupeKey,
    title: input.payload.title,
    body: input.payload.body,
    url: input.payload.url ?? null,
  });
  if (!logId) return null;
  const delivered = await sendPushToUser(input.userId, input.payload);
  await setNotificationDelivered(logId, delivered);
  return delivered;
}
