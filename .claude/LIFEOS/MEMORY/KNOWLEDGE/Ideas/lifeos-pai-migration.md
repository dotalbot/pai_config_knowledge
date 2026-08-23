---
id: kb_677459fec8cb
type: idea
title: "PAI to LifeOS migration — Claude Code as primary harness, OpenCode retired"
tags: [lifeos, migration, opencode, claude-code, infrastructure, architecture, inference]
status: evergreen
quality: 8
confidence: 0.95
source_kind: internal
source_session: 34561945-e99b-4457-a017-cfa156c4921b
created: 2026-08-22
updated: 2026-08-22
convention: kb-v3
related:
  - slug: stale-cron-and-migration-debt-findings
    type: related
  - slug: pulse-tailnet-binding-and-tls
    type: related
  - slug: obsidian-vault-structure-and-inbox-router
    type: related
---

# PAI → LifeOS migration

> **ANSWER FIRST:** Done. `~/.claude` runs **LifeOS 7.40.4 / Algorithm v8.20.2**
> with **Claude Code as the primary harness**. OpenCode is retired — process
> stopped, port 7878 free. The `PAI/` tree is **deleted**; `LIFEOS/` replaced it.
> Do not call `Inference.ts --opencode`; every model tier resolves to Claude.

Recorded 2026-08-22, verified against the machine. Migration ran 2026-08-20;
source ISA is `LIFEOS/MEMORY/WORK/opencode-pai-migration/ISA.md` (`phase: complete`).

## What changed

| | Before | After |
|---|---|---|
| Harness | OpenCode | **Claude Code** (`~/.claude`) |
| Version | PAI 5.0.0 | **LifeOS 7.40.4** |
| Algorithm | v6.3.0 | **v8.20.2** |
| Inference | GPT-5.5 on `localhost:7878` | Claude (haiku / sonnet / claude-fable-5) |
| Tree | `PAI/` | `LIFEOS/` |

A **two-major-version jump**, not a refresh.

## The fact that made it safe

**OpenCode kept NO separate PAI content.** Its `repos/` was empty and all 155
sessions ran in `~/` or `~/.claude` — the work already lived in `~/.claude` and
`~/repo`. Nothing had to be moved out of OpenCode; it only had to be stopped.

OpenCode `serve` ran **detached from init, not systemd**, so stopping it was clean.
The binary, its DB and auth were deliberately left in place — only the harness role
moved.

## Verified end state (2026-08-22)

    OpenCode process     none running
    port 7878            not listening
    ~/.claude/PAI        gone
    ~/.config/PAI        gone
    $HOME literal dir    gone          (the unbraced-path bug, root-caused and fixed)
    ~/.claude_backup     STILL EXISTS  ← pre-migration backup, intentionally kept

`LIFEOS/USER/_migrated-from-pai/` holds the carried-over USER content
(`ABOUTME.md`, `ARCHITECTURE.md`, `Config/`, `CURRENT_STATE/`, `DA/`, `Daemon/`, …).

## The path bug worth remembering

The literal `$HOME` directories came from an **unbraced `$HOME` inside settings.json**
— the harness injects env values verbatim, so `$HOME/…` created a real directory
named `$HOME`. Hence the standing rule: **never a literal `$HOME/…` in settings.json
or a hook command** — use the absolute path there.

## Operating consequences

- **Call `Inference.ts` WITHOUT `--opencode`** at every tier. The OpenCode/GPT-5.5
  backend on `localhost:7878` is shut down; passing the flag targets a dead port.
- `PAI_DIR` is deliberately **not set** in the Pulse service unit — see
  [[pulse-tailnet-binding-and-tls]].
- Anything still pointing at `~/.claude/PAI/...` is broken by definition. One such
  cron survived; see [[stale-cron-and-migration-debt-findings]].

## Migration doctrine that held up

The run was **analysis-and-plan only**, deletion approval-gated per target
("Plan means stop"; build over ask for reversible, ask for irreversible). The
inventory separated four categories before anything was touched:

    (a) the live install   (b) stale OpenCode-era remnants
    (c) accidental junk    (d) the root-cause bug still generating (c)

Sequencing the **root-cause fix first** stopped new junk accruing during cleanup.
That ordering is the reusable lesson.

## Files

- `/home/jellypai/.claude/LIFEOS/MEMORY/WORK/opencode-pai-migration/ISA.md`
- `/home/jellypai/.claude/LIFEOS/USER/_migrated-from-pai/`
- `/home/jellypai/.claude/LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md` — inference rule
