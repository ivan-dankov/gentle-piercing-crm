import { createAdminClient } from '@/lib/supabase/admin'

const CRM_EMAIL = process.env.CRM_USER_EMAIL ?? 'piercinggentle@gmail.com'

let cachedUserId: string | null = null

export function assertAllowedChat(chatId: number): void {
  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID
  if (!allowed) {
    throw new Error('TELEGRAM_ALLOWED_CHAT_ID is not configured')
  }
  if (String(chatId) !== String(allowed)) {
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
