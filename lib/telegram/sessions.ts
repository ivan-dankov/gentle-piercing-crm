import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ResolvedParseSaleResult } from '@/lib/agent/schemas'

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
  userId: string,
  token: string,
  payload: ResolvedParseSaleResult
): Promise<void> {
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  const row = {
    chat_id: chatId,
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
  token: string
): Promise<ResolvedParseSaleResult | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('telegram_sessions')
    .select('pending_payload, expires_at')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as SessionRow

  if (new Date(row.expires_at) < new Date()) {
    await deletePendingSession(chatId)
    return null
  }

  const payload = row.pending_payload
  if (payload.token !== token) return null

  const { token: _t, ...rest } = payload
  return rest
}

export async function deletePendingSession(chatId: number): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('telegram_sessions').delete().eq('chat_id', chatId)
}
