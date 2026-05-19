import { NextResponse } from 'next/server'
import { parseSaleMessage } from '@/lib/agent/parse-message'
import {
  formatFinancialSummary,
  getFinancialSummary,
} from '@/lib/analytics/financial-summary'
import type { AnalyticsPeriod } from '@/lib/analytics/date-presets'
import {
  assertAllowedChat,
  getCrmUserId,
  verifyWebhookSecret,
} from '@/lib/telegram/auth'
import {
  analyticsPeriodKeyboard,
  answerCallbackQuery,
  confirmCancelKeyboard,
  editMessageText,
  sendMessage,
} from '@/lib/telegram/bot'
import { loadCatalog } from '@/lib/telegram/catalog'
import {
  formatConfirmationSummary,
  hasUnresolvedItems,
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

interface TelegramUpdate {
  message?: {
    chat: { id: number }
    text?: string
  }
  callback_query?: {
    id: string
    data?: string
    message?: { chat: { id: number }; message_id: number }
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
      await handleCallbackQuery(update.callback_query)
    } else if (update.message?.text) {
      await handleMessage(update.message)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    const chatId =
      update.message?.chat.id ??
      update.callback_query?.message?.chat.id
    if (chatId) {
      try {
        assertAllowedChat(chatId)
        await sendMessage(
          chatId,
          `Ошибка: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`
        )
      } catch {
        // ignore secondary errors
      }
    }
    return NextResponse.json({ ok: true })
  }
}

async function handleMessage(message: {
  chat: { id: number }
  text?: string
}) {
  const chatId = message.chat.id
  assertAllowedChat(chatId)

  const text = message.text?.trim() ?? ''
  if (!text) return

  if (text === '/start' || text === '/help') {
    await sendMessage(chatId, HELP_TEXT)
    return
  }

  if (text === '/analytics') {
    await sendMessage(chatId, 'Выберите период:', {
      reply_markup: analyticsPeriodKeyboard(),
    })
    return
  }

  const userId = await getCrmUserId()
  const catalog = await loadCatalog(userId)

  await sendMessage(chatId, '⏳ Разбираю сообщение…')

  const parsed = await parseSaleMessage(text, {
    services: catalog.services,
    products: catalog.products,
    timezone: catalog.timezone,
  })

  if (hasUnresolvedItems(parsed)) {
    const summary = formatConfirmationSummary(parsed)
    await sendMessage(
      chatId,
      `${summary}\n\n⚠️ Не все позиции сопоставлены с каталогом. Исправьте сообщение или добавьте в CRM.`
    )
    return
  }

  const token = createSessionToken()
  await savePendingSession(chatId, userId, token, parsed)

  await sendMessage(chatId, formatConfirmationSummary(parsed), {
    reply_markup: confirmCancelKeyboard(token),
  })
}

async function handleCallbackQuery(query: {
  id: string
  data?: string
  message?: { chat: { id: number }; message_id: number }
}) {
  const chatId = query.message?.chat.id
  const messageId = query.message?.message_id
  if (!chatId || !query.data) return

  assertAllowedChat(chatId)
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
    await sendMessage(chatId, formatFinancialSummary(summary))
    return
  }

  if (query.data.startsWith('confirm:')) {
    const token = query.data.slice('confirm:'.length)
    const pending = await loadPendingSession(chatId, token)

    if (!pending) {
      await answerCallbackQuery(query.id, 'Сессия истекла')
      if (messageId) {
        await editMessageText(chatId, messageId, 'Сессия истекла. Отправьте сообщение снова.')
      }
      return
    }

    if (hasUnresolvedItems(pending)) {
      await answerCallbackQuery(query.id, 'Есть несопоставленные позиции')
      return
    }

    const catalog = await loadCatalog(userId)
    const ids = await submitResolvedBookings(
      userId,
      pending.bookings,
      catalog.services,
      catalog.productCostMap
    )
    await deletePendingSession(chatId)
    await answerCallbackQuery(query.id, 'Сохранено')

    const text =
      ids.length === 1
        ? `✅ Запись сохранена (ID: ${ids[0].slice(0, 8)}…)`
        : `✅ Сохранено записей: ${ids.length}`

    if (messageId) {
      await editMessageText(chatId, messageId, text)
    } else {
      await sendMessage(chatId, text)
    }
    return
  }

  if (query.data.startsWith('cancel:')) {
    const token = query.data.slice('cancel:'.length)
    const pending = await loadPendingSession(chatId, token)
    if (pending) {
      await deletePendingSession(chatId)
    }
    await answerCallbackQuery(query.id, 'Отменено')
    if (messageId) {
      await editMessageText(chatId, messageId, '❌ Отменено')
    }
  }
}
