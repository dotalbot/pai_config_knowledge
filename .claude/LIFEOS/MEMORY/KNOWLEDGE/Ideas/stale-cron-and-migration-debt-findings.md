---
id: kb_c608630cd33a
type: idea
title: "Migration debt sweep — stale cron, gitignore, and two claims that did not hold"
tags: [infrastructure, cron, gitignore, security, lifeos, migration, verification]
status: budding
quality: 7
confidence: 0.9
source_kind: internal
source_session: 34561945-e99b-4457-a017-cfa156c4921b
created: 2026-08-22
updated: 2026-08-22
convention: kb-v3
related:
  - slug: lifeos-pai-migration
    type: caused-by
  - slug: pulse-tailnet-binding-and-tls
    type: related
---

# Migration debt sweep — findings

> **ANSWER FIRST:** One live stale cron (`habit-notify.sh`, points into the
> deleted `PAI/` tree, fails silently every day at 09:07). The gitignore problem
> was **already fixed** on 2026-08-21. No Telegram token leak exists — that claim
> did not survive verification.

Recorded 2026-08-22. Every line below was checked against the machine, not
recalled. Two of the reported findings were wrong; they are kept here so the same
false alarms are not re-investigated.

## CONFIRMED — one stale cron

    7 9 * * * bash /home/jellypai/.claude/PAI/TOOLS/habit-notify.sh

`/home/jellypai/.claude/PAI` **does not exist** — the tree was archived during the
2026-08-20 migration. This entry fires daily at 09:07 and fails silently.

The other three entries all resolve to live files and are healthy:

| Schedule    | Target                        | State |
|-------------|-------------------------------|-------|
| `0 * * * *` | `LIFEOS/TOOLS/ObsidianInboxRouter.ts` | OK — running hourly |
| `30 2 * * *`| `~/bin/backup-claude-to-git.sh`       | OK |
| `7 9 * * *` | `PAI/TOOLS/habit-notify.sh`           | **BROKEN — path deleted** |
| `*/3 * * * *`| `LIFEOS/TOOLS/ob-sync.sh`            | OK — vault sync |

Fix: repoint to a `LIFEOS/TOOLS/` equivalent or drop the line with
`crontab -e`. **One stale cron, not three** — the other three were verified live.

Inbox router confirmed working from its own log:

    Run complete — 1 routed, 0 unclassified, 5 pinned, 0 too recent

## ALREADY FIXED — the gitignore

The gitignore was written for the old `PAI/` layout and left the live `LIFEOS/`
tree unprotected. **This was repaired on 2026-08-21** and the fix is in the file
with its own explanatory header:

    # LIFEOS/ — mirrors the PAI/ rules above (added 2026-08-21)
    # The 2026-08-20 migration moved PAI/ -> LIFEOS/ but .gitignore was never
    # updated, leaving 34 dead PAI/ rules and the live LIFEOS/ tree unprotected.

Secrets are now covered at any depth by belt-and-braces rules:

    **/.env
    **/.credentials.json
    **/CREDENTIALS/
    *.pem
    *.key

Verified: `git check-ignore -v .env` → matched by `**/.env`. The 34 dead `PAI/`
rules are still present but are inert, not dangerous — cosmetic cleanup only.

## NOT REPRODUCED — no Telegram token leak

Searched for a Telegram bot-token pattern (`[0-9]{8,10}:AA[A-Za-z0-9_-]{30,}`)
across:

- the entire working tree (excluding `.git`, `node_modules`) — **no match**
- all git-tracked files — **no match**
- git history across all refs — **no match**

Telegram appears only as **integration source code and documentation** (Hermes
sidecar, Pulse Conduit classifier, the official Telegram plugin) — no credential
value. `.env` exists at `~/.claude/.env` (224 bytes) and is correctly ignored.

**Conclusion: no leak.** If a token was ever pasted in-session, it never reached
disk or git. Do not re-open this without new evidence.

## The transferable lesson

Three findings were reported; **one was real, one was already fixed, one never
existed.** A migration leaves debt that is easy to over-report from memory — a
deleted parent directory makes every path under it suspect, which invites
guessing at scale. The cheap check that settles it:

    for p in <paths>; do [ -e "$p" ] && echo "OK $p" || echo "MISSING $p"; done

Verify each path against the filesystem before writing any of them down. See
[[lifeos-pai-migration]] for what the migration actually moved.
