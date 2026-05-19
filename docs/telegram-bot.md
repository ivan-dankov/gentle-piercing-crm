# Telegram booking bot

Private bot for logging sales from shorthand messages and viewing revenue/profit.

## Environment variables

Copy placeholders from [`.env.local.example`](../.env.local.example) into `.env.local`, or add to Vercel:

```env
TELEGRAM_BOT_TOKEN=          # from @BotFather
TELEGRAM_ALLOWED_CHAT_ID=    # group id (negative) or private chat id
TELEGRAM_ALLOWED_TOPIC_ID=   # forum topic id (message_thread_id); required for topic-only mode
TELEGRAM_WEBHOOK_SECRET=     # random string; sent as X-Telegram-Bot-Api-Secret-Token
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o          # optional; default gpt-4o (use gpt-4o-mini to save cost)
SUPABASE_SERVICE_ROLE_KEY=   # server only — never expose to client
CRM_USER_EMAIL=piercinggentle@gmail.com
```

Existing `NEXT_PUBLIC_SUPABASE_URL` is required.

If `TELEGRAM_ALLOWED_TOPIC_ID` is set, only messages in that **forum topic** are processed (any sender). Other topics and chats are ignored silently.

## Database

Apply migrations:

```bash
supabase db push
# or run 022 and 023 in the SQL editor
```

## BotFather setup

1. Create a bot with [@BotFather](https://t.me/BotFather) → `/newbot` → copy token.
2. For a **group with topics**: add the bot to the group → **Group Privacy → Turn off** (`/setprivacy` in BotFather).
3. Get ids — post a test message **inside the target topic**, then open  
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and read:
   - `message.chat.id` → `TELEGRAM_ALLOWED_CHAT_ID` (negative for supergroups)
   - `message.message_thread_id` → `TELEGRAM_ALLOWED_TOPIC_ID`
4. After deploying the app, set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN/api/telegram/webhook",
    "secret_token": "YOUR_TELEGRAM_WEBHOOK_SECRET",
    "allowed_updates": ["message", "callback_query"]
  }'
```

## Usage

- Send a sale message in your usual shorthand format → review summary → tap **Подтвердить**.
- Menu → **/analytics** → pick **Сегодня**, **Эта неделя**, or **Этот месяц**.
- **/help** — short instructions.

Bookings are created with `client_id = null` (no clients in the bot).

## Local testing

Use a tunnel (e.g. ngrok) to expose `/api/telegram/webhook` and point the Telegram webhook URL to it. Set the same env vars locally.
