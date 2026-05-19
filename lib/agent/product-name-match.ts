/** Normalize RU/UA spelling variants for catalog name matching */
export function normalizeProductNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/лосьйон/g, 'лосьон')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Canonical keys for fuzzy accessory / bijouterie matching */
export function productNameCanonicalKey(text: string): string | null {
  const n = normalizeProductNameKey(text)
  if (/лосьон|lotion/.test(n)) return 'losion'
  if (/спрей|spray/.test(n)) return 'spray'
  if (/даунсайз|downsize/.test(n)) return 'downsize'
  if (/бижутерия\s*али|біжутерія\s*алі/i.test(n) || /\bали\b/.test(n)) {
    return 'bij_ali'
  }
  if (/бижутер|бижу|bijouterie/i.test(n)) return 'bijouterie'
  return null
}

export function productNamesMatch(hint: string, catalogName: string): boolean {
  const h = normalizeProductNameKey(hint)
  const c = normalizeProductNameKey(catalogName)

  const hintKey = productNameCanonicalKey(h)
  const catalogKey = productNameCanonicalKey(c)
  if (hintKey && catalogKey && hintKey === catalogKey) return true

  return c.includes(h) || h.includes(c)
}

export function productNameSearchTerms(hint: string): string[] {
  const q = normalizeProductNameKey(hint)
  const terms = new Set<string>([q])
  const key = productNameCanonicalKey(q)

  if (key === 'losion') {
    terms.add('лосьон')
    terms.add('лосьйон')
    terms.add('lotion')
  }
  if (key === 'spray') terms.add('спрей')
  if (key === 'downsize') {
    terms.add('даунсайз')
    terms.add('downsize')
  }
  if (key === 'bij_ali') {
    terms.add('бижутерия али')
    terms.add('али')
  }
  if (key === 'bijouterie') terms.add('бижутер')
  if (/пары|серьг|сереж/.test(q)) {
    terms.add('бижутерия али')
    terms.add('али')
  }

  return [...terms]
}
