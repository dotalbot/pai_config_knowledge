---
id: kb_07bc9dec8595
type: idea
title: "Obsidian vault structure — Sources tier, atomicity rule, and the inbox router pin rule"
tags: [obsidian, vault, knowledge-management, zettelkasten, inbox-router, adhd, lifeos]
status: evergreen
quality: 8
confidence: 0.95
source_kind: internal
source_session: 34561945-e99b-4457-a017-cfa156c4921b
created: 2026-08-22
updated: 2026-08-22
convention: kb-v3
related:
  - slug: ObsidianVaultAndSync
    type: extends
  - slug: company-knowledge-wiki
    type: instance-of
  - slug: stale-cron-and-migration-debt-findings
    type: related
---

# Obsidian vault structure, Sources tier, and the inbox router

> **ANSWER FIRST:** The vault is `/home/jellypai/obsidian`. Two brains: `01 Thinking`
> (Dom's own judgment) and `02 Doing` (AI context). `Sources/` sits between them for
> other people's material. The **atomicity test** is: 6+ `##` sections means it is a
> document, not a note. The **pin rule** (router rule 0) keeps a file in the inbox.

Recorded 2026-08-22. The canonical, much fuller document is the vault's own
`01 Thinking/Maps/Vault Guide.md` — **read that first**; this note exists so the
structure is recallable without opening the vault.

## The two-brain model

    00 INBOX     raw capture, low trust by design
        │
        ├──▶ Sources/      other people's material, worked up   (weight 0.9)
        │        │
        │        ▼  what I actually take from it
        └──▶ 01 Thinking/  MY words, atomic, one idea           (weight 1.2)
                 │
                 ▼  once I rely on it for AI work
             02 Doing/     written to hand to an agent          (weight 1.5)

`02 Doing` outranks everything on read because it was written expressly as agent
context. It is currently **empty** but is wired into the read path already, so it
starts working the moment a note lands there.

## Sources vs Thinking — the rule that was missing

A YouTube write-up is a **source**, not a thought. Filing extractions into
`01 Thinking` polluted a folder meant for Dom's own judgment. `Sources/` was added
2026-08-21 to hold them; `Sources/Lists/` holds bare link collections with no prose.

**Atomicity test:** a Thinking note holds ONE idea. **Six or more `##` sections
means it is a document, not a note** — move it to `Sources/` or split it.

Audit 2026-08-21: 8 of 57 notes failed. After the sweep, 7 of 47 remained.

## The back catalogue is deliberately NOT retrofitted

**Decision, 2026-08-21.** 46 of 47 notes in `01 Thinking` had no "What I think"
section. That is *not* a backlog. Retrofitting judgment onto a note written a year
ago mostly invents a position Dom may no longer hold.

- New notes use the template, which asks for his take before it counts as done
- Old notes get reworked only when he returns to the subject with something to say
- **Structural** problems still get fixed on sight (move to `Sources/`, split, relist)

The template is a forward-facing gate, not a migration project. Do not propose a
retrofit sweep.

## The inbox router and its pin rule

Hourly cron runs `LIFEOS/TOOLS/ObsidianInboxRouter.ts`, which classifies each inbox
note and moves it. **Nothing moves for the first 2 hours** — a grace period so a
note still being edited never vanishes mid-thought.

Priority order, first match wins:

| # | Rule | Signal |
|---|------|--------|
| 0 | **Pinned** | `status: pinned`, `router: skip`, or filename starting `TODO` / `_` → **left alone** |
| 1 | Source override | `source: youtube` → `Sources/YouTube` |
| 2 | Type field | `type: <x>` — the reliable path, templates set it |
| 3 | Tags | `tags:` containing a route name |
| 4 | Filename | voice, meeting, standup, quote, idea, tool, journal |
| 5 | Content | "attendees:" / "action items" → meeting · leading `>` → quote |
| 6 | Default | `00 INBOX/_unrouted/` **and it notifies** |

Rule 6 is deliberate: an unclassifiable note means the template or routing table
needs work, so it parks the file in plain sight rather than guessing it into a
folder Dom would never check.

### Why rule 0 exists — the near miss

**On 2026-08-22 a dry run showed all five TODO briefs about to be filed into
`05 Journal/Thoughts`**, because they carry `type: capture`. Those briefs are
referenced by their `00 INBOX/...` path from `LIFEOS/USER/PROJECTS.md` — every one
of those paths would have broken **silently**. Rule 0 was added in response.

Prefer frontmatter pinning (`status: pinned` or `router: skip`) over the filename
convention: **the filename rule breaks if you rename the file.**

Always dry-run after touching the routing table:

    bun run LIFEOS/TOOLS/ObsidianInboxRouter.ts --dry-run

## Read path guardrails

Config: `LIFEOS/USER/INTEGRATIONS/obsidian.yaml` — the single source of truth for
the vault path, replacing 6 hardcoded constants. Read-only by choice: the DA reads
these folders and never writes them. The only vault write is the session note into
`07 PAI`.

Excluded from reads: `Archive` (~9,900 files / 808MB — would swamp relevance
ranking), `Attachments`, `Excalidraw`, `Clippings`, `.obsidian`, `Toolkit/Scripts`,
`Toolkit/Snippets`, and `07 PAI` itself — reading our own session notes back is an
echo chamber.

Limits: max 5 notes, 4,000 chars per note, 15,000 chars total.

## Files

- `/home/jellypai/obsidian/01 Thinking/Maps/Vault Guide.md` — **canonical, read this**
- `/home/jellypai/obsidian/01 Thinking/Maps/Vault Restructure Proposal.md` — rationale
- `/home/jellypai/.claude/LIFEOS/USER/INTEGRATIONS/obsidian.yaml` — paths, weights, limits
- `/home/jellypai/.claude/LIFEOS/TOOLS/ObsidianInboxRouter.ts` — `ROUTES` table

Sync is covered by [[ObsidianVaultAndSync]] — 3-minute cron, no git needed.
