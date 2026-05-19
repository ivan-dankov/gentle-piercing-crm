/** Telegram hard limit; keep below for suffixes and HTML */
export const TELEGRAM_MESSAGE_LIMIT = 4096
export const TELEGRAM_SAFE_LIMIT = 3900

export function splitTelegramMessage(
  text: string,
  maxLen: number = TELEGRAM_SAFE_LIMIT
): string[] {
  if (text.length <= maxLen) return [text]

  const chunks: string[] = []
  let rest = text

  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('\n', maxLen)
    if (cut < Math.floor(maxLen * 0.4)) cut = maxLen
    chunks.push(rest.slice(0, cut).trimEnd())
    rest = rest.slice(cut).trimStart()
  }

  if (rest.length > 0) chunks.push(rest)
  return chunks
}

export function fitTelegramMessage(
  text: string,
  maxLen: number = TELEGRAM_SAFE_LIMIT
): string {
  if (text.length <= maxLen) return text
  const suffix = '\n\n<i>…сообщение сокращено</i>'
  return text.slice(0, maxLen - suffix.length).trimEnd() + suffix
}

export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
