-- Support forum topic sessions (composite key: group chat + topic thread)
ALTER TABLE telegram_sessions
  ADD COLUMN IF NOT EXISTS message_thread_id BIGINT NOT NULL DEFAULT 0;

ALTER TABLE telegram_sessions DROP CONSTRAINT IF EXISTS telegram_sessions_pkey;
ALTER TABLE telegram_sessions ADD PRIMARY KEY (chat_id, message_thread_id);
