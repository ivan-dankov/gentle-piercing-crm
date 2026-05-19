const TELEGRAM_API = 'https://api.telegram.org'

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  return token
}

async function telegramRequest<T>(
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${getToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Telegram API ${method}: ${data.description ?? res.status}`)
  }
  return data.result as T
}

export interface InlineKeyboardButton {
  text: string
  callback_data: string
}

export type TelegramReplyTarget = {
  chatId: number
  messageThreadId?: number
}

function threadParams(target: TelegramReplyTarget): Record<string, number> {
  if (target.messageThreadId && target.messageThreadId > 0) {
    return { message_thread_id: target.messageThreadId }
  }
  return {}
}

export async function sendMessage(
  target: TelegramReplyTarget,
  text: string,
  options?: {
    reply_markup?: {
      inline_keyboard: InlineKeyboardButton[][]
    }
  }
): Promise<{ message_id: number }> {
  return telegramRequest('sendMessage', {
    chat_id: target.chatId,
    text,
    parse_mode: 'HTML',
    ...threadParams(target),
    ...options,
  })
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await telegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  })
}

export async function editMessageText(
  target: TelegramReplyTarget,
  messageId: number,
  text: string
): Promise<void> {
  await telegramRequest('editMessageText', {
    chat_id: target.chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    ...threadParams(target),
  })
}

export function confirmCancelKeyboard(sessionToken: string) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: `confirm:${sessionToken}` },
        { text: '❌ Отмена', callback_data: `cancel:${sessionToken}` },
      ],
    ],
  }
}

export function analyticsPeriodKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Сегодня', callback_data: 'analytics:today' },
        { text: 'Эта неделя', callback_data: 'analytics:thisWeek' },
      ],
      [{ text: 'Этот месяц', callback_data: 'analytics:thisMonth' }],
    ],
  }
}

export function formatPln(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}
