#!/usr/bin/env bash
# SetAdoCreds.sh — store Azure DevOps credentials in ~/.claude/.env safely.
#
# Reads the PAT from a hidden prompt so it never appears in chat, in your shell
# history, or in a process argument list (where `ps` would expose it).
#
#   bash ~/.claude/LIFEOS/TOOLS/SetAdoCreds.sh
set -euo pipefail
ENV=~/.claude/.env
umask 077

read -rp "Azure DevOps organisation (the ORG in dev.azure.com/ORG): " ADO_ORG
read -rp "Default project name (blank to set later): " ADO_PROJECT
read -rsp "Personal Access Token (hidden, will not echo): " ADO_PAT; echo

[ -n "${ADO_ORG:-}" ] && [ -n "${ADO_PAT:-}" ] || { echo "org and PAT are required" >&2; exit 1; }

# Replace any existing values rather than appending duplicates.
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
grep -vE '^(ADO_ORG|ADO_PROJECT|ADO_PAT)=' "$ENV" 2>/dev/null > "$tmp" || true
{ printf '\n# Azure DevOps — added %s\n' "$(date +%F)"
  # Always quote: project names contain spaces, and an unquoted value makes
  # `. .env` execute the second word as a command (hit live 2026-08-25).
  printf 'ADO_ORG="%s"\n' "$ADO_ORG"
  printf 'ADO_PROJECT="%s"\n' "$ADO_PROJECT"
  printf 'ADO_PAT="%s"\n' "$ADO_PAT"; } >> "$tmp"
mv "$tmp" "$ENV"; chmod 600 "$ENV"; trap - EXIT

echo "Stored in $ENV (chmod 600, gitignored)."
echo "Scopes needed: Work Items (Read) — read-only is enough for the cockpit."
