---
id: 20260911-202508_github-trending-source-is-configured-but-blocked-gh
slug: github-trending-source-is-configured-but-blocked-gh
status: applied
source: upgrade-skill
created: 2026-09-11T20:25:08.371Z
expires: 2026-10-11T20:25:08.371Z
confidence: 0.95
target_surface: settings
session_id: 
ledger_id: 
evidence:
  - "gh auth status 2026-09-11; skills/Upgrade/user-sources.json created this run"
---

## Claim

GitHub trending source is configured but blocked: gh CLI is installed and unauthenticated

## Current State

gh 2.45.0 installed; 'gh auth status' reports no logged-in hosts; no GH_TOKEN in ~/.claude/.env; skills/Upgrade/user-sources.json now exists with 3 queries

## Recommendation

Run 'gh auth login' (or add GH_TOKEN to ~/.claude/.env) to unblock the trending source; config and query shapes are already verified

## Notes

- 2026-09-11T20:25:08.371Z — created (source: upgrade-skill)
- 2026-09-11T21:25:58.528Z — applied: gh auth login completed as dotalbot; 3 queries returned results and State/github-trending.json banked 7 repos
