import type { ResolvedParseSaleResult } from '@/lib/agent/schemas'
import { formatPln } from '@/lib/telegram/bot'

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

export function formatConfirmationSummary(
  result: ResolvedParseSaleResult,
  timezone: string = 'Europe/Warsaw'
): string {
  const parts: string[] = [
    '<b>Проверьте перед сохранением:</b>',
    `<i>Время записи: ${formatMessageSentAt(result.message_sent_at, timezone)}</i>`,
    '',
  ]

  result.bookings.forEach((b, i) => {
    if (result.bookings.length > 1) {
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

  if (result.unmatched_lines.length > 0) {
    parts.push('<b>Не распознано:</b>')
    for (const line of result.unmatched_lines) {
      parts.push(`  • ${line}`)
    }
    parts.push('')
  }

  parts.push('Нажмите кнопку ниже для сохранения.')
  return parts.join('\n')
}

export function hasUnresolvedItems(result: ResolvedParseSaleResult): boolean {
  for (const b of result.bookings) {
    for (const s of b.services) {
      if (!s.service_id || s.match_confidence === 'none') return true
    }
    for (const p of b.products) {
      if (!p.product_id || p.match_confidence === 'none') return true
    }
  }
  return false
}
