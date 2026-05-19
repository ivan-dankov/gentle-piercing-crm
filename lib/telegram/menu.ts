const TELEGRAM_API = 'https://api.telegram.org'

export async function registerBotMenu(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  await fetch(`${TELEGRAM_API}/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'analytics', description: 'Аналитика — выручка и прибыль' },
        { command: 'help', description: 'Помощь' },
      ],
    }),
  })

  await fetch(`${TELEGRAM_API}/bot${token}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ menu_button: { type: 'commands' } }),
  })
}

export const HELP_TEXT = `Отправьте сообщение с продажей в привычном формате, например:
150
160 (32)
15 лосьон

Бот покажет сводку — нажмите «Подтвердить», чтобы сохранить.

/analytics — выручка и прибыль за период`
