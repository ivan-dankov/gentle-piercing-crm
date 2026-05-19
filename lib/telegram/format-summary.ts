import type {
  ResolvedBookingDraft,
  ResolvedParseSaleResult,
} from '@/lib/agent/schemas'
import type { FinancialSummary } from '@/lib/analytics/financial-summary'
import { formatTodaySnapshot } from '@/lib/analytics/financial-summary'
import { formatPln } from '@/lib/telegram/bot'
import {
  escapeTelegramHtml,
  fitTelegramMessage,
  TELEGRAM_SAFE_LIMIT,
} from '@/lib/telegram/message-limits'

const MAX_BOOKINGS_FULL = 10
const MAX_BOOKINGS_COMPACT = 6
const MAX_UNMATCHED_SHOWN = 8
const MAX_SAVED_BOOKINGS_SHOWN = 12

function lineProduct(p: {
  price: number
  qty?: number
  sku_hint?: string
  name_hint?: string
  resolved_name?: string
  resolved_sku?: string | null
  match_confidence?: string
}): string {
  const label =
    p.resolved_name ??
    p.name_hint ??
    (p.sku_hint ? `SKU ${p.sku_hint}` : '?')
  const sku = p.resolved_sku ? ` [${p.resolved_sku}]` : ''
  const warn = p.match_confidence === 'none' ? ' ⚠️' : ''
  const qty = (p.qty ?? 1) > 1 ? ` ×${p.qty}` : ''
  return `  • ${label}${sku}: ${formatPln(p.price)} PLN${qty}${warn}`
}

function lineService(s: {
  price: number
  label?: string
  resolved_name?: string
  match_confidence?: string
}): string {
  const label = s.resolved_name ?? s.label ?? 'Услуга'
  const warn = s.match_confidence === 'none' ? ' ⚠️' : ''
  return `  • ${label}: ${formatPln(s.price)} PLN${warn}`
}

export function formatMessageSentAt(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatBookingCompact(b: ResolvedBookingDraft, index: number): string {
  const svc = b.services.length
  const prod = b.products.length
  const warn =
    b.services.some((s) => !s.service_id || s.match_confidence === 'none') ||
    b.products.some((p) => !p.product_id || p.match_confidence === 'none')
      ? ' ⚠️'
      : ''
  return `<b>Запись ${index + 1}:</b> ${svc} усл., ${prod} тов. — ${formatPln(b.total_paid)} PLN${warn}`
}

function appendBookings(
  parts: string[],
  bookings: ResolvedBookingDraft[],
  compact: boolean
): void {
  const limit = compact ? MAX_BOOKINGS_COMPACT : MAX_BOOKINGS_FULL

  bookings.slice(0, limit).forEach((b, i) => {
    if (compact) {
      parts.push(formatBookingCompact(b, i))
      return
    }

    if (bookings.length > 1) {
      parts.push(`<b>Запись ${i + 1}</b>`)
    }
    for (const s of b.services) {
      parts.push(lineService(s))
    }
    for (const p of b.products) {
      parts.push(lineProduct(p))
    }
    parts.push(`  <b>Итого:</b> ${formatPln(b.total_paid)} PLN`)
    if (b.booksy_fee_enabled) {
      parts.push('  Booksy: да')
    }
    parts.push('')
  })

  if (bookings.length > limit) {
    parts.push(
      `<i>…и ещё ${bookings.length - limit} записей (всего ${bookings.length})</i>`,
      ''
    )
  }
}

export function formatConfirmationSummary(
  result: ResolvedParseSaleResult,
  timezone: string = 'Europe/Warsaw'
): string {
  const compact = result.bookings.length > MAX_BOOKINGS_FULL
  const parts: string[] = [
    '<b>Проверьте перед сохранением:</b>',
    `<i>Время записи: ${formatMessageSentAt(result.message_sent_at, timezone)}</i>`,
    `<i>Записей: ${result.bookings.length}</i>`,
    '',
  ]

  appendBookings(parts, result.bookings, compact)

  if (result.unmatched_lines.length > 0) {
    parts.push('<b>Не распознано:</b>')
    const shown = result.unmatched_lines.slice(0, MAX_UNMATCHED_SHOWN)
    for (const line of shown) {
      const short =
        line.length > 72 ? `${line.slice(0, 69)}…` : line
      parts.push(`  • ${escapeTelegramHtml(short)}`)
    }
    if (result.unmatched_lines.length > MAX_UNMATCHED_SHOWN) {
      parts.push(
        `  <i>…и ещё ${result.unmatched_lines.length - MAX_UNMATCHED_SHOWN} строк</i>`
      )
    }
    parts.push('')
  }

  if (canConfirm(result)) {
    parts.push('Нажмите кнопку ниже для сохранения.')
  } else {
    parts.push('Добавьте позиции в CRM или уточните сообщение.')
  }

  return fitTelegramMessage(parts.join('\n'), TELEGRAM_SAFE_LIMIT)
}

/** At least one line item can be saved (has catalog id) */
export function canConfirm(result: ResolvedParseSaleResult): boolean {
  return result.bookings.some(
    (b) =>
      b.services.some((s) => s.service_id) ||
      b.products.some((p) => p.product_id)
  )
}

/** Parsed rows missing catalog match — they will not be saved on confirm */
export function hasUnresolvedItems(result: ResolvedParseSaleResult): boolean {
  for (const b of result.bookings) {
    for (const s of b.services) {
      if (!s.service_id) return true
    }
    for (const p of b.products) {
      if (!p.product_id) return true
    }
  }
  return false
}

export function hasConfirmationWarnings(result: ResolvedParseSaleResult): boolean {
  return hasUnresolvedItems(result) || result.unmatched_lines.length > 0
}

function savedLineService(s: {
  price: number
  resolved_name?: string
  label?: string
}): string {
  const label = s.resolved_name ?? s.label ?? 'Услуга'
  return `  • ${label}: ${formatPln(s.price)} PLN`
}

function savedLineProduct(p: {
  price: number
  qty?: number
  resolved_name?: string
  resolved_sku?: string | null
}): string {
  const label = p.resolved_name ?? 'Товар'
  const sku = p.resolved_sku ? ` [${p.resolved_sku}]` : ''
  const qty = (p.qty ?? 1) > 1 ? ` ×${p.qty}` : ''
  return `  • ${label}${sku}: ${formatPln(p.price)} PLN${qty}`
}

function savedBookingTotal(b: ResolvedBookingDraft): number {
  const services = b.services
    .filter((s) => s.service_id)
    .reduce((sum, s) => sum + s.price, 0)
  const products = b.products
    .filter((p) => p.product_id)
    .reduce((sum, p) => sum + p.price * (p.qty ?? 1), 0)
  return services + products
}

export function formatSavedSummary(
  result: ResolvedParseSaleResult,
  savedBookingCount: number,
  today?: FinancialSummary
): string {
  const parts: string[] = [
    savedBookingCount === 1
      ? '✅ <b>Запись сохранена</b>'
      : `✅ <b>Сохранено записей: ${savedBookingCount}</b>`,
    '',
  ]

  const savable = result.bookings.filter(
    (b) =>
      b.services.some((s) => s.service_id) ||
      b.products.some((p) => p.product_id)
  )
  const compact = savable.length > MAX_SAVED_BOOKINGS_SHOWN
  let index = 0

  for (const b of savable) {
    const savedServices = b.services.filter((s) => s.service_id)
    const savedProducts = b.products.filter((p) => p.product_id)
    if (savedServices.length === 0 && savedProducts.length === 0) continue

    index += 1
    if (index > MAX_SAVED_BOOKINGS_SHOWN) continue

    if (compact) {
      parts.push(
        `<b>${index}.</b> ${savedServices.length} усл., ${savedProducts.length} тов. — ${formatPln(savedBookingTotal(b))} PLN`
      )
      continue
    }

    if (savedBookingCount > 1) {
      parts.push(`<b>Запись ${index}</b>`)
    }
    for (const s of savedServices) {
      parts.push(savedLineService(s))
    }
    for (const p of savedProducts) {
      parts.push(savedLineProduct(p))
    }
    parts.push(`  <b>Итого:</b> ${formatPln(savedBookingTotal(b))} PLN`)
    parts.push('')
  }

  if (savable.length > MAX_SAVED_BOOKINGS_SHOWN) {
    parts.push(
      `<i>…и ещё ${savable.length - MAX_SAVED_BOOKINGS_SHOWN} записей</i>`,
      ''
    )
  }

  if (today) {
    parts.push(formatTodaySnapshot(today))
  }

  return fitTelegramMessage(parts.join('\n').trimEnd(), TELEGRAM_SAFE_LIMIT)
}
