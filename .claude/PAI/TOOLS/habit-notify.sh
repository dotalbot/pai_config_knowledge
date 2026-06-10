#!/bin/bash
# Daily habit notification — How I Use AI challenge capture
# Called by crontab at 9:07am daily

BOT_TOKEN="8976425744:AAGRnEBmZCw1RlK33fbjTVEnv0aLQBahqhQ"
CHAT_ID="6043726567"
MESSAGE="🤖 *What challenge are you facing today?*

Open \`How I Use AI\` in Obsidian → log one challenge → close.

30 seconds. That's the whole habit."

# PAI voice notify (logs even if voice not configured)
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "What challenge are you facing today? Open How I Use AI in Obsidian.", "voice_id": "21m00Tcm4TlvDq8ikWAM", "voice_enabled": true}' \
  > /dev/null 2>&1

# Telegram
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": ${CHAT_ID}, \"text\": \"${MESSAGE}\", \"parse_mode\": \"Markdown\"}" \
  > /dev/null 2>&1
