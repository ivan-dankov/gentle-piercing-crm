import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ResolvedParseSaleResult } from '@/lib/agent/schemas'
import { normalizeThreadId } from '@/lib/telegram/auth'

const SESSION_TTL_MS = 30 * 60 * 1000

type SessionRow = {
  pending_payload: ResolvedParseSaleResult & { token?: string }
  expires_at: string
}

export function createSessionToken(): string {
  return randomBytes(16).toString('hex')
}

export async function savePendingSession(
  chatId: number,
  messageThreadId: number,
  userId: string,
  token: string,
  payload: ResolvedParseSaleResult
): Promise<void> {
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const threadId = normalizeThreadId(messageThreadId)

  const row = {
    chat_id: chatId,
    message_thread_id: threadId,
    user_id: userId,
    pending_payload: { token, ...payload },
    expires_at: expiresAt,
  }
  const { error } = await supabase
    .from('telegram_sessions')
    .upsert(row as never)

  if (error) throw error
}

export async function loadPendingSession(
  chatId: number,
  messageThreadId: number,
  token: string
): Promise<ResolvedParseSaleResult | null> {
  const supabase = createAdminClient()
  const threadId = normalizeThreadId(messageThreadId)

  const { data, error } = await supabase
    .from('telegram_sessions')
    .select('pending_payload, expires_at')
    .eq('chat_id', chatId)
    .eq('message_thread_id', threadId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as SessionRow

  if (new Date(row.expires_at) < new Date()) {
    await deletePendingSession(chatId, messageThreadId)
    return null
  }

  const payload = row.pending_payload
  if (payload.token !== token) return null

  const { token: _t, ...rest } = payload
  return rest
}

export async function deletePendingSession(
  chatId: number,
  messageThreadId: number
): Promise<void> {
  const supabase = createAdminClient()
  const threadId = normalizeThreadId(messageThreadId)
  await supabase
    .from('telegram_sessions')
    .delete()
    .eq('chat_id', chatId)
    .eq('message_thread_id', threadId)
}
