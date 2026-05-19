import { NextResponse } from 'next/server'
import { parseSaleMessage } from '@/lib/agent/parse-message'
import {
  formatFinancialSummary,
  getFinancialSummary,
} from '@/lib/analytics/financial-summary'
import type { AnalyticsPeriod } from '@/lib/analytics/date-presets'
import {
  getCrmUserId,
  isAllowedUpdate,
  normalizeThreadId,
  verifyWebhookSecret,
} from '@/lib/telegram/auth'
import {
  analyticsPeriodKeyboard,
  answerCallbackQuery,
  confirmCancelKeyboard,
  editMessageText,
  sendLongMessage,
  sendMessage,
  type TelegramReplyTarget,
} from '@/lib/telegram/bot'
import { loadCatalog } from '@/lib/telegram/catalog'
import {
  formatConfirmationSummary,
  formatSavedSummary,
  canConfirm,
  hasConfirmationWarnings,
} from '@/lib/telegram/format-summary'
import { HELP_TEXT, registerBotMenu } from '@/lib/telegram/menu'
import {
  createSessionToken,
  deletePendingSession,
  loadPendingSession,
  savePendingSession,
} from '@/lib/telegram/sessions'
import { submitResolvedBookings } from '@/lib/telegram/submit-bookings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let menuRegistered = false

interface TelegramMessage {
  chat: { id: number }
  text?: string
  date: number
  message_thread_id?: number
  is_topic_message?: boolean
}

interface TelegramUpdate {
  message?: TelegramMessage
  callback_query?: {
    id: string
    data?: string
    message?: TelegramMessage & { message_id: number }
  }
}

function replyTarget(
  chatId: number,
  messageThreadId?: number
): TelegramReplyTarget {
  return {
    chatId,
    messageThreadId: normalizeThreadId(messageThreadId) || undefined,
  }
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!menuRegistered && process.env.TELEGRAM_BOT_TOKEN) {
    menuRegistered = true
    registerBotMenu().catch(console.error)
  }

  let update: TelegramUpdate
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (update.callback_query) {
      const msg = update.callback_query.message
      if (!msg) return NextResponse.json({ ok: true })
      if (!isAllowedUpdate(msg.chat.id, msg.message_thread_id)) {
        return NextResponse.json({ ok: true })
      }
      await handleCallbackQuery(update.callback_query, msg)
    } else if (update.message?.text) {
      const { chat, message_thread_id } = update.message
      if (!isAllowedUpdate(chat.id, message_thread_id)) {
        return NextResponse.json({ ok: true })
      }
      await handleMessage(update.message)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    const msg = update.message ?? update.callback_query?.message
    if (msg && isAllowedUpdate(msg.chat.id, msg.message_thread_id)) {
      const target = replyTarget(msg.chat.id, msg.message_thread_id)
      try {
        await sendMessage(
          target,
          `Ошибка: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`
        )
      } catch {
        // ignore secondary errors
      }
    }
    return NextResponse.json({ ok: true })
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id
  const threadId = normalizeThreadId(message.message_thread_id)
  const target = replyTarget(chatId, threadId)

  const text = message.text?.trim() ?? ''
  if (!text) return

  if (text.startsWith('/')) {
    const command = text.split(/\s/)[0]?.toLowerCase()
    if (command === '/start' || command === '/help') {
      await sendMessage(target, HELP_TEXT)
      return
    }
    if (command === '/analytics') {
      await sendMessage(target, 'Выберите период:', {
        reply_markup: analyticsPeriodKeyboard(),
      })
      return
    }
  }

  const userId = await getCrmUserId()
  const catalog = await loadCatalog(userId)

  await sendMessage(target, '⏳ Разбираю сообщение…')

  const messageSentAt = new Date(message.date * 1000)

  const parsed = await parseSaleMessage(
    text,
    {
      services: catalog.services,
      products: catalog.products,
      timezone: catalog.timezone,
    },
    messageSentAt
  )

  const summary = formatConfirmationSummary(parsed, catalog.timezone)

  if (!canConfirm(parsed)) {
    await sendLongMessage(
      target,
      `${summary}\n\n⚠️ Не удалось сопоставить позиции с каталогом. Исправьте сообщение или добавьте в CRM.`
    )
    return
  }

  const token = createSessionToken()
  await savePendingSession(chatId, threadId, userId, token, parsed)

  const warning = hasConfirmationWarnings(parsed)
    ? '\n\n⚠️ Часть строк не сохранится (нет в каталоге). Подтвердите, чтобы сохранить сопоставленное.'
    : ''

  await sendLongMessage(target, summary + warning, {
    reply_markup: confirmCancelKeyboard(token),
  })
}

async function handleCallbackQuery(
  query: {
    id: string
    data?: string
  },
  message: TelegramMessage & { message_id: number }
) {
  const chatId = message.chat.id
  const threadId = normalizeThreadId(message.message_thread_id)
  const target = replyTarget(chatId, threadId)
  const messageId = message.message_id

  if (!query.data) return

  const userId = await getCrmUserId()

  if (query.data.startsWith('analytics:')) {
    const period = query.data.replace('analytics:', '') as AnalyticsPeriod
    if (!['today', 'thisWeek', 'thisMonth'].includes(period)) return

    const catalog = await loadCatalog(userId)
    const summary = await getFinancialSummary(
      userId,
      period,
      catalog.timezone
    )
    await answerCallbackQuery(query.id)
    await sendMessage(target, formatFinancialSummary(summary))
    return
  }

  if (query.data.startsWith('confirm:')) {
    const token = query.data.slice('confirm:'.length)
    const pending = await loadPendingSession(chatId, threadId, token)

    if (!pending) {
      await answerCallbackQuery(query.id, 'Сессия истекла')
      await editMessageText(
        target,
        messageId,
        'Сессия истекла. Отправьте сообщение снова.'
      )
      return
    }

    if (!canConfirm(pending)) {
      await answerCallbackQuery(query.id, 'Нет позиций для сохранения')
      return
    }

    const catalog = await loadCatalog(userId)
    const sentAt = pending.message_sent_at
      ? new Date(pending.message_sent_at)
      : new Date()

    const ids = await submitResolvedBookings(
      userId,
      pending.bookings,
      catalog.services,
      catalog.productCostMap,
      sentAt
    )
    const today = await getFinancialSummary(
      userId,
      'today',
      catalog.timezone
    )
    await deletePendingSession(chatId, threadId)
    await answerCallbackQuery(query.id, 'Сохранено')

    const text = formatSavedSummary(pending, ids.length, today)

    await editMessageText(target, messageId, text)
    return
  }

  if (query.data.startsWith('cancel:')) {
    const token = query.data.slice('cancel:'.length)
    const pending = await loadPendingSession(chatId, threadId, token)
    if (pending) {
      await deletePendingSession(chatId, threadId)
    }
    await answerCallbackQuery(query.id, 'Отменено')
    await editMessageText(target, messageId, '❌ Отменено')
  }
}
