export type AnalyzedLine =
  | { kind: 'product_sku'; price: number; sku_hint: string; qty: number }
  | { kind: 'product_name'; price: number; name_hint: string; qty: number }
  | { kind: 'service_price'; price: number }
  | { kind: 'service_named'; price: number; label: string }
  | { kind: 'qty_shorthand'; raw: string }
  | { kind: 'unparsed'; raw: string }

const PRODUCT_NAME_RE =
  /лосьон|лосьйон|спрей|бижутер|бижу|сваровск|серьг|сереж|колечк|пара|даунсайз|downsize|китай|али/i

const SERVICE_NAME_RE =
  /восстановлен|прокол|пирсинг|мочк|уш|нос|бров|губ|замена|дополнительн|выезд/i

function classifyByLabel(
  price: number,
  label: string,
  qty = 1
): AnalyzedLine[] {
  const clean = label.replace(/\s+/g, ' ').trim()
  if (!clean) return [{ kind: 'service_price', price }]

  if (PRODUCT_NAME_RE.test(clean) && !SERVICE_NAME_RE.test(clean)) {
    return [{ kind: 'product_name', price, name_hint: clean, qty }]
  }
  if (SERVICE_NAME_RE.test(clean) || clean.split(/\s+/).length > 4) {
    return [{ kind: 'service_named', price, label: clean }]
  }
  if (clean.split(/\s+/).length <= 3) {
    return [{ kind: 'product_name', price, name_hint: clean, qty }]
  }
  return [{ kind: 'service_named', price, label: clean }]
}

/** "Лосьон 20", "спрей 15" */
export function tryParseNameFirstPrice(line: string): AnalyzedLine[] | null {
  const m = line.match(
    /^([а-яА-ЯёЁa-zA-Z][\w\s-]*?)\s+(\d{2,4})\s*(?:зл|zł|pln)?\s*$/i
  )
  if (!m) return null
  const name = m[1].trim()
  const price = Number(m[2])
  if (name.length < 2) return null
  return classifyByLabel(price, name)
}

/** "Замена … 100 зл все вместе", "3 пары сережек 210 зл" */
export function tryParsePriceLast(line: string): AnalyzedLine[] | null {
  const qtyBundle = line.match(
    /^(\d+)\s+(?:пары?\s+)?(.+?)\s+(\d{2,4})\s*(?:зл|zł|pln)?\s*$/i
  )
  if (qtyBundle) {
    const qty = Number(qtyBundle[1])
    const desc = qtyBundle[2].trim()
    const total = Number(qtyBundle[3])
    if (/пары|серьг|сереж/i.test(desc)) {
      const unitPrice =
        qty > 0 && total % qty === 0 ? total / qty : total
      return [
        {
          kind: 'product_name',
          price: unitPrice,
          name_hint: 'бижутерия Али',
          qty,
        },
      ]
    }
    return classifyByLabel(total, `${qty} ${desc}`, qty)
  }

  const m = line.match(/^(.+?)\s+(\d{2,4})\s*(?:зл|zł|pln)\s*(.*)?$/i)
  if (!m) return null
  const tail = m[3]?.trim()
  const label = tail ? `${m[1].trim()} ${tail}` : m[1].trim()
  const price = Number(m[2])
  if (label.length < 3) return null
  return classifyByLabel(price, label)
}

/** "100 зл серьги …", "110 даунсайз" */
export function tryParsePriceFirst(line: string): AnalyzedLine[] | null {
  const m = line.match(/^(\d{2,4})\s*(?:зл|zł|pln)?\s+(.+)$/i)
  if (!m) return null
  const price = Number(m[1])
  const label = m[2].trim()
  if (label.length < 2) return null
  return classifyByLabel(price, label)
}

/** "170 (1232) - k1232c" */
export function tryParseSkuNoteLine(line: string): AnalyzedLine[] | null {
  const m = line.match(
    /^(\d+)\s*\(\s*([^)]+)\s*\)\s*(?:[-–—]\s*([кКkK]?[\w\d-]+))?\s*$/i
  )
  if (!m) return null
  const sku = (m[3]?.trim() || m[2].trim()).replace(/^к/i, 'K')
  return [
    {
      kind: 'product_sku',
      price: Number(m[1]),
      sku_hint: sku,
      qty: 1,
    },
  ]
}

/** "420 зл (выезд , серьги 39 за 160 зл …)" */
export function tryParseParentheticalBundle(line: string): AnalyzedLine[] | null {
  const m = line.match(/^(\d{3,4})\s*(?:зл|zł|pln)?\s*\(([^)]+)\)\s*$/i)
  if (!m) return null

  const total = Number(m[1])
  const inner = m[2]
  const items: AnalyzedLine[] = []

  if (/выезд/i.test(inner)) {
    items.push({
      kind: 'service_named',
      price: total,
      label: inner.trim(),
    })
  } else {
    items.push({ kind: 'service_named', price: total, label: inner.trim() })
  }

  for (const sm of inner.matchAll(
    /серьг\w*\s+(\d+)\s+за\s+(\d+)(?:\s*(?:зл|zł|pln))?/gi
  )) {
    items.push({
      kind: 'product_sku',
      price: Number(sm[2]),
      sku_hint: sm[1].trim(),
      qty: 1,
    })
  }

  for (const sm of inner.matchAll(/(?:спрей|лосьон|лосьйон)\s+(\d+)/gi)) {
    const tag = sm[0].toLowerCase().includes('спрей') ? 'спрей' : 'лосьон'
    items.push({
      kind: 'product_name',
      price: Number(sm[1]),
      name_hint: tag,
      qty: 1,
    })
  }

  return items.length > 0 ? items : null
}

/** "70 серьги Китай", "70 сережки бижу" */
export function tryParsePriceThenWords(line: string): AnalyzedLine[] | null {
  const m = line.match(/^(\d{2,4})\s+([а-яА-ЯёЁa-zA-Z].+)$/i)
  if (!m) return null
  const price = Number(m[1])
  const label = m[2].trim()
  if (!PRODUCT_NAME_RE.test(label) && !SERVICE_NAME_RE.test(label)) {
    return null
  }
  return classifyByLabel(price, label)
}
