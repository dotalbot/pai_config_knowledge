#!/usr/bin/env bash
# LifeOS Obsidian sync — runs `ob sync` on the vault, lock-guarded so a slow
# sync never overlaps the next cron tick. Wired 2026-08-20.
set -euo pipefail
OB=/home/jellypai/.local/npm/bin/ob
VAULT=/home/jellypai/obsidian
LOG=/home/jellypai/.claude/LIFEOS/MEMORY/STATE/ob-sync.log
LOCK=/tmp/ob-sync.lock
# flock: skip this tick if a previous sync is still running
exec 9>"$LOCK"
if ! flock -n 9; then echo "$(date -Is) skip — previous sync still running" >> "$LOG"; exit 0; fi
echo "$(date -Is) sync start" >> "$LOG"
"$OB" sync --path "$VAULT" >> "$LOG" 2>&1 && echo "$(date -Is) sync ok" >> "$LOG" || echo "$(date -Is) sync FAILED ($?)" >> "$LOG"
# keep log from growing unbounded
tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
