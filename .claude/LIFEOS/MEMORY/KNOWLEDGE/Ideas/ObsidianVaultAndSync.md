---
title: Obsidian vault location and sync
type: knowledge
domain: Ideas
date: 2026-08-22
tags: [obsidian, vault, sync, infrastructure]
related:
  - relation: part-of
    target: LifeOS infrastructure
  - slug: obsidian-vault-structure-and-inbox-router
    type: extends
---

# Obsidian vault location and sync

> **ANSWER FIRST:** the live vault is `/home/jellypai/obsidian`. It syncs to
> Obsidian cloud every 3 minutes via cron (`LIFEOS/TOOLS/ob-sync.sh`), verified
> working. It does NOT need git. Any other vault path you find is stale.

**Canonical answer to "where is the vault" and "is it backed up".** Recorded
2026-08-22 after failing to recall it on demand.

## Live location

    /home/jellypai/obsidian

This is the ONLY vault Dom works in and the only one JellyPai reads or writes.
`LIFEOS/USER/INTEGRATIONS/obsidian.yaml` points here for both the session-note
write path and the `VaultQuery.ts` read path.

## Sync — every 3 minutes, working

    */3 * * * * /home/jellypai/.claude/LIFEOS/TOOLS/ob-sync.sh

Wired 2026-08-20. The script runs `ob sync --path /home/jellypai/obsidian`
using the `ob` CLI at `~/.local/npm/bin/ob`, guarded by `flock` on
`/tmp/ob-sync.lock` so a slow sync never overlaps the next tick. Log at
`LIFEOS/MEMORY/STATE/ob-sync.log`, truncated to the last 500 lines each run.

Destination is Obsidian cloud plus several other hosts. Verified healthy
2026-08-22 20:39 — "Fully synced", "sync ok".

**Consequence: the vault does NOT need git.** It is replicated off-machine every
three minutes. Do not propose putting `~/obsidian` under version control; that
question is settled.

## Retired location — do not use

The retired path is `/opt/docker/appdata/obsidian-jellybase/vault/OB_v2`, a
separate directory (different inode, not a bind mount). Frozen since
2026-08-20 12:41, the LifeOS migration day. 1,810 markdown files versus 1,872 in
the live vault, and it has none of the 2026-08-21 restructure — no `Sources/`,
no populated `02 Doing/`.

**Dom is expiring this vault in due course.** Never read from it, never write to
it, and do not treat a file's presence there as evidence of anything.

Two things still point at it and will break or misfile when it goes:

- `ObsidianCaptureServer.ts` — hardcodes it as `VAULT`. Parked 2026-08-22; a
  Moleskine submission interface is planned to replace it.
- `ObsidianInboxRouter` — PORTED 2026-08-22 to `LIFEOS/TOOLS/`, crontab repointed.

## Related
- [[obsidian-vault-structure-and-inbox-router]] — the vault's folder tiers, the
  Sources/Thinking atomicity rule, and the inbox router's pin rule
- `LIFEOS/USER/INTEGRATIONS/obsidian.yaml`
- `LIFEOS/TOOLS/ob-sync.sh`
- `LIFEOS/TOOLS/VaultQuery.ts`
