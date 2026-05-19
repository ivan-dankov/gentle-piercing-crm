import { createAdminClient } from '@/lib/supabase/admin'

const CRM_EMAIL = process.env.CRM_USER_EMAIL ?? 'piercinggentle@gmail.com'

let cachedUserId: string | null = null

/** Forum topics use message_thread_id; private chats use 0 */
export function normalizeThreadId(messageThreadId?: number): number {
  return messageThreadId ?? 0
}

/**
 * Returns true when the update is from the configured group/topic.
 * Other chats and topics are ignored silently (no error reply).
 */
export function isAllowedUpdate(
  chatId: number,
  messageThreadId?: number
): boolean {
  const allowedChat = process.env.TELEGRAM_ALLOWED_CHAT_ID
  if (!allowedChat || String(chatId) !== String(allowedChat)) {
    return false
  }

  const allowedTopic = process.env.TELEGRAM_ALLOWED_TOPIC_ID?.trim()
  if (!allowedTopic) {
    return true
  }

  return String(normalizeThreadId(messageThreadId)) === allowedTopic
}

/** @deprecated use isAllowedUpdate — kept for error handler paths */
export function assertAllowedChat(chatId: number): void {
  if (!isAllowedUpdate(chatId)) {
    throw new Error('Unauthorized chat')
  }
}

export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) return true

  const header = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (header === secret) return true

  const url = new URL(request.url)
  return url.searchParams.get('secret') === secret
}

export async function getCrmUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId

  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })

  if (error) throw error

  const user = data.users.find((u) => u.email === CRM_EMAIL)
  if (!user) {
    throw new Error(`CRM user not found: ${CRM_EMAIL}`)
  }

  cachedUserId = user.id
  return user.id
}
