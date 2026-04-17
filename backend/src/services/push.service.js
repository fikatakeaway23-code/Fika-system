import { prisma } from '../lib/prisma.ts';

/**
 * Push notification service using Expo's push API.
 * No extra dependency required — uses native fetch.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to one or more Expo push tokens.
 */
async function sendPush(tokens, title, body, data = {}) {
  const messages = tokens
    .filter((t) => t && t.startsWith('ExponentPushToken'))
    .map((to) => ({ to, title, body, data, sound: 'default' }));

  if (messages.length === 0) return;

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    // Push failures should never break the main flow
    console.error('[Push] Failed to send notification:', err.message);
  }
}

/**
 * Send a push notification to all users with the 'owner' role.
 */
export async function sendPushToOwner(title, body, data = {}) {
  const owners = await prisma.user.findMany({
    where: { role: 'owner', pushToken: { not: null } },
    select: { pushToken: true },
  });
  const tokens = owners.map((o) => o.pushToken);
  await sendPush(tokens, title, body, data);
}

/**
 * Send a push notification to a specific user by ID.
 */
export async function sendPushToUser(userId, title, body, data = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });
  if (user?.pushToken) {
    await sendPush([user.pushToken], title, body, data);
  }
}
