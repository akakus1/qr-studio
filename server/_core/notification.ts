export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Logs a notification to the console (owner notifications).
 * In production, replace this with an email service (e.g., Resend, SendGrid)
 * or a webhook to Slack/Discord.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = payload;
  if (!title || !content) return false;

  // Log to console — replace with email/webhook in production
  console.log(`[Notification] ${title}: ${content}`);
  return true;
}
