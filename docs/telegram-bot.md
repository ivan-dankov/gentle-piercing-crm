# Telegram booking bot

Private bot for logging sales from shorthand messages and viewing revenue/profit.

## Environment variables

Copy placeholders from [`.env.local.example`](../.env.local.example) into `.env.local`, or add to Vercel:

```env
TELEGRAM_BOT_TOKEN=          # from @BotFather
TELEGRAM_ALLOWED_CHAT_ID=    # your Telegram chat id (numeric)
TELEGRAM_WEBHOOK_SECRET=     # random string; sent as X-Telegram-Bot-Api-Secret-Token
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini     # optional
SUPABASE_SERVICE_ROLE_KEY=   # server only — never expose to client
CRM_USER_EMAIL=piercinggentle@gmail.com
```

Existing `NEXT_PUBLIC_SUPABASE_URL` is required.

## Database

Apply migration:

```bash
supabase db push
# or run supabase/migrations/022_telegram_sessions.sql in the SQL editor
```

## BotFather setup

1. Create a bot with [@BotFather](https://t.me/BotFather) → `/newbot` → copy token.
2. Get your chat id: message the bot, then open  
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `message.chat.id`.
3. After deploying the app, set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN/api/telegram/webhook",
    "secret_token": "YOUR_TELEGRAM_WEBHOOK_SECRET",
    "allowed_updates": ["message", "callback_query"]
  }'
```

4. Optional: disable privacy mode if the bot is in a group (`/setprivacy` → Disable).

## Usage

- Send a sale message in your usual shorthand format → review summary → tap **Подтвердить**.
- Menu → **/analytics** → pick **Сегодня**, **Эта неделя**, or **Этот месяц**.
- **/help** — short instructions.

Bookings are created with `client_id = null` (no clients in the bot).

## Local testing

Use a tunnel (e.g. ngrok) to expose `/api/telegram/webhook` and point the Telegram webhook URL to it. Set the same env vars locally.
