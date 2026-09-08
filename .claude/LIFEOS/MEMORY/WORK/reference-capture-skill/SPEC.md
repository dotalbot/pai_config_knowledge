---
title: Reference Capture Skill — Specification
type: spec
date: 2026-09-07
status: agreed
tags: [spec, skill, obsidian, reference]
---

# Reference Capture Skill — Spec

## The problem this solves

Dom encounters things worth remembering — a video, an article, a tool, a channel —
at a rate far above the rate he can think about them. Today those either vanish, or
land in `00 INBOX` where they become debt: five TODOs from 2026-08-22 were still
unprocessed sixteen days later.

The failure is not capture and it is not filing. It is that **captured material has
no way of reaching him again at the moment it would be useful.**

## What this is NOT

Not an inbox. `00 INBOX` is a queue with a terminal state — every item must be
processed, turned into a Thinking note, or discarded. Reference material has no
terminal state. A saved link that surfaces during work on steelmanning has done its
entire job without ever earning a Verdict, and no guilt attaches to it.

This distinction is load-bearing. If Reference becomes a second inbox, the skill has
failed regardless of how well it files.

## Vision

Dom pastes a URL with one command and forgets it. Months later, working on a
subject, JellyPai says "you saved three things on this in August" and names them.
The capture cost about ten seconds of his attention; the payoff arrives unprompted,
at the moment of relevance, without him remembering that he saved anything.

## Architecture

Two artefacts per capture, always both:

1. **The note** — human-readable markdown in `~/obsidian/Reference/`, syncs to the
   Mac, readable and editable in Obsidian like any other note.
2. **The index entry** — a record in `~/.claude/LIFEOS/MEMORY/reference-index.json`,
   which JellyPai searches to surface items in the terminal without Obsidian being
   open.

The index is a **cache, never the source of truth.** It is rebuildable at any time
by re-reading the frontmatter of every note under `Reference/`. It lives outside the
vault deliberately: it is machinery, not a note, and putting it in the vault means
it syncs, appears in search results, and Obsidian tries to render it.

### Folder structure

```
~/obsidian/Reference/
├── README.md              the contract, mirroring Sources/README.md
├── YouTube/               individual videos
├── Web/                   individual articles, posts, papers
├── Channels/              channel anchors (earned, see below)
├── Sites/                 site anchors (earned, see below)
└── Tools/                 repos, CLIs, plugins, skills
```

### Anchors are earned, not assumed

An anchor (channel or site) is created only when:
- Dom explicitly names one ("save this channel"), OR
- A **third** item from the same source arrives.

Below that threshold, items stand alone and record their origin in frontmatter
(`channel:` / `site:`). Rationale: most captured videos come from channels never
explicitly anchored. Requiring a parent would auto-generate near-empty stubs Dom
never asked for. One saved Anthropic blog post must not create an `anthropic.com`
anchor.

When the third item arrives, the anchor is created and the two prior items are
retro-linked to it.

### Graduation to Sources

`Reference/` holds enriched-but-unprocessed material. `Sources/` holds processed
write-ups, per its own README. An item graduates Reference → Sources when Dom does
the real write-up. The skill does not graduate items automatically; it may suggest
candidates (see US-9).

## User Stories

### US-1 — Capture a web article

**As** Dom, **when** I paste an article URL, **I want** it fetched, summarised and
filed, **so that** I can move on within seconds and find it again later.

**Acceptance criteria**
- AC-1.1 Given a valid article URL, the note is created under `Reference/Web/`.
- AC-1.2 Frontmatter contains: `title`, `type: reference`, `medium: web`, `url`,
  `author`, `published`, `captured` (date), `status: captured`, `tags`, `site`.
- AC-1.3 Body contains a 2-4 sentence summary of what the piece actually argues,
  not a description of what it is about.
- AC-1.4 Tags are derived from content, minimum 3, and reuse existing vault tags
  where they exist rather than inventing near-duplicates.
- AC-1.5 An index entry is written to `reference-index.json` in the same operation.
- AC-1.6 Existing Reference and Thinking notes sharing 2+ tags are listed under
  `## Related` as wikilinks.
- AC-1.7 Total elapsed time under 45 seconds for a typical article.
- AC-1.8 If the URL 404s or is unfetchable, the note is still created with the URL
  and a `status: unfetchable` flag rather than failing silently.

### US-2 — Capture a YouTube video

**As** Dom, **when** I give a video URL, **I want** it captured with channel
attribution, **so that** videos cluster by source over time.

**Acceptance criteria**
- AC-2.1 Note created under `Reference/YouTube/`, filename = video title, sanitised.
- AC-2.2 Frontmatter adds `channel`, `duration`, `published` to the US-1 set.
- AC-2.3 `medium: youtube`.
- AC-2.4 If a channel anchor already exists, `⬆️::` points at it; otherwise `⬆️::`
  points at `[[Reference/README|Reference]]`.
- AC-2.5 The summary is derived from the transcript where obtainable, and from
  title plus description where not, and the note states which.
- AC-2.6 Capturing the third video from a previously unanchored channel creates the
  anchor and retro-links all three.

### US-3 — Capture a YouTube channel

**As** Dom, **when** I name a channel, **I want** an anchor describing what kind of
videos it carries, **so that** I know why I follow it and future videos have a home.

**Acceptance criteria**
- AC-3.1 Note created under `Reference/Channels/`.
- AC-3.2 Frontmatter: `type: anchor`, `medium: youtube`, `channel_url`,
  `subscriber_count` where available, `captured`, `tags`.
- AC-3.3 Body contains a description of the channel's subject matter and typical
  format, derived from its actual recent videos, not its self-description alone.
- AC-3.4 A `## Videos` section lists captured videos from that channel as wikilinks,
  REGENERATED from child-note frontmatter on each capture from that channel — never
  incrementally appended (see D3).
- AC-3.6 The generated list is fenced by `<!-- capture:generated:start -->` and
  `<!-- capture:generated:end -->`; content outside the fence survives regeneration.
- AC-3.7 Regeneration drops entries whose note file no longer exists.
- AC-3.8 Regeneration is idempotent: running it twice with no new captures produces a
  byte-identical file.
- AC-3.5 A channel anchor has no terminal state and is never flagged as unprocessed.

### US-4 — Capture a site

**As** Dom, **when** I name a site or blog, **I want** an anchor, **so that**
articles from it cluster the way videos cluster under channels.

**Acceptance criteria**
- AC-4.1 Note created under `Reference/Sites/`, structure mirroring US-3.
- AC-4.2 An `## Articles` section, regenerated and fenced as in AC-3.4, AC-3.6, AC-3.7, AC-3.8.
- AC-4.3 Same earned-anchor threshold as channels.

### US-5 — Capture a tool or repo

**As** Dom, **when** I save a tool, **I want** it to enter the existing tool
lifecycle, **so that** this skill extends the Vault Guide rather than competing
with it.

**Acceptance criteria**
- AC-5.1 Note created under `Reference/Tools/`.
- AC-5.2 `status: to-try`, matching the Vault Guide lifecycle values
  (`to-try` → `testing` → `adopted` / `rejected`).
- AC-5.3 Body states what it is, and what it might be for in Dom's context
  specifically — not a generic README paraphrase.
- AC-5.4 The note is linkable from `[[AI Tools & Repos MOC]]` under "To try".
- AC-5.5 A tool that reaches `adopted` or `rejected` is a graduation candidate.

### US-6 — Capture a raw snippet with no URL

**As** Dom, **when** I paste text or a thought with no source, **I want** it
captured, **so that** the skill handles the case where there is nothing to fetch.

**Acceptance criteria**
- AC-6.1 Note created under `Reference/Web/` with `medium: snippet`, no `url`.
- AC-6.2 Enrichment is tag derivation and relationship-finding only; no fetch.
- AC-6.3 Under 10 seconds.

### US-7 — Classification from a bare string

**As** Dom, **when** I invoke the skill with only a string, **I want** the type
inferred, **so that** I never have to specify.

**Acceptance criteria**
- AC-7.1 YouTube video URLs (`watch?v=`, `youtu.be/`) → US-2.
- AC-7.2 YouTube channel URLs (`/@handle`, `/channel/`, `/c/`) → US-3.
- AC-7.3 Known code hosts (github.com, gitlab.com) → US-5.
- AC-7.4 Bare domain or explicit "site"/"blog" language → US-4.
- AC-7.5 Any other URL → US-1.
- AC-7.6 No URL present → US-6.
- AC-7.7 On genuine ambiguity, JellyPai states the chosen classification in one
  line rather than asking, and Dom can correct it after the fact.

### US-8 — Contextual surfacing (the payoff)

**As** Dom, **when** I am working on a subject, **I want** JellyPai to tell me what
I have already saved about it, **so that** captures pay off without my remembering
them.

**Acceptance criteria**
- AC-8.1 JellyPai searches `reference-index.json` when a subject emerges in work,
  without being asked.
- AC-8.2 Surfacing states the title, when it was captured, and one line on why it
  is relevant now.
- AC-8.3 Maximum 3 items surfaced at once, ranked by tag-overlap strength.
- AC-8.4 The same item is not re-surfaced in the same session.
- AC-8.5 Search completes in under 2 seconds with 1,000 items indexed.
- AC-8.6 Surfacing works with Obsidian closed and the Mac offline.
- AC-8.7 Zero matches produces silence, never a "nothing found" message.
- AC-8.8 `/capture sleep <duration>` suppresses surfacing until the stated expiry.
- AC-8.9 Sleep expires on its own; no explicit cancel is required.
- AC-8.10 `/capture wake` resumes surfacing immediately regardless of expiry.
- AC-8.11 Sleep suppresses surfacing only; captures still work while asleep.

### US-9 — Review what is accumulating

**As** Dom, **when** I ask what I have been saving, **I want** a grouped view,
**so that** I can spot clusters worth real thinking.

**Acceptance criteria**
- AC-9.1 On request, output items grouped by tag cluster, newest first.
- AC-9.2 Flag clusters of 3+ items on one subject as candidates for a Thinking note.
- AC-9.3 Report counts by type and by age.
- AC-9.4 Never framed as a backlog, a queue, or work owed. No guilt language.

### US-10 — Index integrity

**As** the system, **the index must** stay consistent with the notes, **so that**
surfacing does not go stale or point at deleted files.

**Acceptance criteria**
- AC-10.1 A rebuild command regenerates the index from note frontmatter alone.
- AC-10.2 Rebuild is idempotent.
- AC-10.3 Index entries whose note file is gone are dropped on rebuild.
- AC-10.4 A note edited by hand in Obsidian is reconciled on next rebuild.
- AC-10.5 Index writes are atomic — write to temp, then rename — so an interrupted
  capture cannot corrupt it.

## Constraints

- **Never write to `~/obsidian/.obsidian/`.** The Mac holds authoritative app config.
- **Personal material only.** Work-confidential source material goes to
  `~/corpus/inform/`, never the vault. If a capture URL is work-domain, the skill
  refuses and says why.
- **TypeScript, bun.** No Python.
- **Reference/ must not become an inbox.** No overdue flags, no unprocessed counts
  in a nag surface, no guilt.
- **Sources/ contract is untouched.** Reference does not write into Sources.
- **Enrichment must degrade, not fail.** An unfetchable URL still produces a note.

## Resolved decisions

These were open during design and are now settled. Recorded here so the reasoning
survives, per the repo convention that superseded decisions are marked superseded
rather than kept as live alternatives.

### D1 — Command name: `/capture`

Settled 2026-09-07. Chosen over `/ref` and `/save`.

### D2 — Surfacing is always-on, with a sleep control

Settled 2026-09-07. Surfacing runs by default because opt-in surfacing is surfacing
that never happens — the whole failure this skill addresses is that Dom does not
remember he saved anything, so requiring him to remember to enable it reproduces the
original problem.

Controls:
- `/capture sleep <duration>` — suppress surfacing for a period (e.g. `2h`, `1d`).
- `/capture wake` — resume immediately.
- Sleep state is recorded in the index file with an expiry timestamp, so it lapses on
  its own rather than needing to be cancelled.

Combined with AC-8.7 (zero matches produces silence) and AC-8.3 (max 3 items), the
intrusion ceiling is low enough that always-on is tolerable.

### D3 — Anchor child-lists are REGENERATED, not appended

Settled 2026-09-07, after checking the live sync behaviour rather than assuming it.

**What was checked.** `ob-sync.log` shows sync running roughly every three minutes,
`Conflict strategy: merge`, `Device name: jellybase (Linux)`, and zero conflict files
anywhere in the vault. So sync conflict is a smaller risk than first assumed: the
collision window is Dom having the anchor open on the Mac at the moment of an append,
and merge handles it.

**Why regenerate anyway.** Two reasons that outrank the conflict question:

1. **The repo's generated-artefact convention.** `ARCHITECTURE_SUMMARY.md` and
   `PRINCIPAL_TELOS.md` are regenerated by their generators and never hand-patched.
   An anchor's `## Videos` list is a derived view — "every note whose `channel:`
   field equals this channel" — and deriving it on each write makes it correct by
   construction. Incremental appends drift from the underlying frontmatter.

2. **Self-healing.** A note deleted by hand in Obsidian, renamed, or given a corrected
   `channel:` value is fixed automatically on the next capture from that source. An
   append-only list would keep pointing at the deleted note indefinitely.

**Cost accepted.** Regeneration overwrites the generated block. Hand-written content
inside it would be lost, so the block is fenced:

```markdown
## Videos

<!-- capture:generated:start -->
- [[Some video title]] — captured 2026-09-07
<!-- capture:generated:end -->

Anything written below the end marker is preserved across regenerations.
```

**Write amplification is the real cost, and it is bounded.** A capture writes the item
note, the index, and at most one anchor. The third-item case additionally rewrites two
retro-linked children: five writes maximum, all small, all local, syncing on the next
three-minute cycle.

### D4 — Index location: outside the vault

Settled during design. `~/.claude/LIFEOS/MEMORY/reference-index.json`. It is machinery,
not a note: in the vault it would sync to the Mac, appear in search results, and
Obsidian would attempt to render it. It is a rebuildable cache (US-10), never a source
of truth.

## Test strategy

- Classification: table test of 20 input strings covering all US-7 branches.
- Enrichment degradation: 404 URL, paywalled URL, video with transcript disabled.
- Anchor threshold: capture 3 videos from one channel, assert anchor created on the
  third and prior two retro-linked.
- Index integrity: capture 10, delete 2 notes by hand, rebuild, assert 8 entries.
- Surfacing: seed 50 items, assert relevant subject returns correct top-3 under 2s.
- Anchor regeneration: capture 3 from one source, hand-delete one child note, capture a
  fourth, assert the anchor lists exactly 3 and the deleted entry is gone.
- Fence preservation: write prose below the end marker, trigger regeneration, assert the
  prose survives byte-identical.
- Regeneration idempotency: run twice with no new captures, assert identical file hash.
- Sleep control: sleep 1h, assert no surfacing; assert capture still works while asleep;
  assert wake restores surfacing.
- Vault boundary: assert no write under `.obsidian/` across the full test run.
