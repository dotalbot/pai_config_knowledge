# Plan: Obsidian Capture System Overhaul + Webhook Extension

## Context

Two connected problems: (1) QuickAdd has 9 choices causing decision paralysis at capture time for an ADHD brain — every extra choice burns executive function that should go to the thought itself. (2) The voice webhook only works on iOS; there's no Android path, no plain-text capture, no YouTube extraction.

Multi-angle analysis (IterativeDepth, ApertureOscillation, FirstPrinciples, SystemsThinking) converged on a single architectural insight: **the ObsidianInboxRouter already implements the right architecture** — everything to INBOX, classified later. The QuickAdd menu was undermining it by forcing classification at capture time. The fix is to align QuickAdd with the router's design, not fight it.

---

## Decision: The 3 Note Types

Taxonomy is based on **cognitive state at capture time**, not content type:

| Type | Emoji | When | Where |
|---|---|---|---|
| **capture** | 📥 | I'm capturing a moment (voice, text, YouTube, fleeting thought) | → 00 INBOX |
| **meeting** | 🗣️ | I'm in a structured event with others | → 02 Cards/Meetings |
| **note** | 💡 | I'm deliberately writing up permanent knowledge | → 02 Cards |

Everything previously separate (idea, concept, learning note, tool, literature note, fleeting note) collapses into either **capture** or **note** via tags + topic field. Journal/periodic stays in the Periodic Notes plugin — not QuickAdd.

---

## Frontmatter Schema

**Shared core (all types):**
```yaml
title: ""
type: capture | meeting | note
date: 2026-06-07          # YYYY-MM-DD always
tags: []
```

**Per-type extensions:**
```yaml
# capture only
source: voice | text | youtube | web | ""  # blank = typed manually in Obsidian

# meeting only
attendees: []
company: ""
summary: ""

# note only
status: draft             # draft → permanent lifecycle signal
topic: ""                 # free-text, JellyPai normalises
source: ""                # URL, book title, etc.
```

**ExcaliBrain body links (all types, NOT frontmatter):**
```
⬆️:: [[Notes MOC]]   # Note template default
⬆️:: [[Work]]        # Meeting template default
⬆️::                 # Capture template — blank, transient notes don't need graph nodes
```

---

## What Gets Built

### 1. Three new templates
- `06 Toolkit/Templates/Capture Template.md`
- `06 Toolkit/Templates/Meeting Template.md`
- `06 Toolkit/Templates/Note Template.md`

Old templates archived (prefixed `_`) not deleted.

### 2. QuickAdd config update (data.json)
Strip from 9 → 3 choices. Back up first. New choices point to new templates. Note choice enables `chooseFromSubfolders: true` for future folder growth.

### 3. Migration script: `PAI/Tools/MigrateVaultFrontmatter.ts`
- `--dry-run` flag (ALWAYS run first)
- `--folder` and `--type` flags for scoped runs
- Transformations: `Date-Created`/`Date-Added` → `date` (normalised to YYYY-MM-DD), hash tags `"#Tag"` → `Tag`, adds `type: note` to untyped notes, remaps `type: voice` → `type: capture` + `source: voice`
- **Explicit exclusions**: Archive/, .obsidian/, and any note with `type: pai-session`
- Runs on: 02 Cards, 03 Spaces, 05 Journal, 00 INBOX (NOT Archive)

### 4. Router fixes: `PAI/Tools/ObsidianInboxRouter.ts`
- Fix case-sensitivity bug: `^type:` → `^[Tt]ype:` (live bug — Type: capital T is in old Fleeting Note Template)
- Add `capture` route → `05 Journal/Thoughts`
- Add Pulse notification on fallback-to-default (silent failure mode fixed)
- Reduce age gate from 24h → 2h for tighter loop

### 5. New unified server: `PAI/Tools/ObsidianCaptureServer.ts`
Replaces `ObsidianVoiceWebhook.ts` (process pid 4185470 gets stopped). Same port 27337. Backwards-compatible `/voice-note` endpoint. New endpoints:

| Endpoint | Payload | Note type |
|---|---|---|
| `POST /voice-note` | `{transcription, title?}` | capture, source: voice |
| `POST /capture` | `{text, title?, source?}` | capture, source: text |
| `POST /youtube` | `{url, title?}` | capture, source: youtube |
| `GET /` | — | Web capture UI (HTML form) |

YouTube extraction: `yt-dlp --write-auto-sub --skip-download --sub-format vtt`, parse VTT to plain text, trim to 4000 chars. Falls back gracefully to URL-only note if yt-dlp fails or times out (30s).

**yt-dlp is NOT installed** — needs installing before /youtube works.

### 6. Web capture UI (inline in GET /)
Mobile-responsive HTML form with:
- Multi-line text area ("Capture a thought")
- YouTube URL field (auto-detects URL → routes to /youtube)
- Optional title field
- Submit → success confirmation
- Works as plain HTML POST fallback (no JS required for text capture)
- Secret token never in client HTML

### 7. systemd user service: `~/.config/systemd/user/ObsidianCaptureServer.service`
Replaces the current manually-started bun process. `Restart=on-failure`.

---

## Execution Order (safe-first)

1. Install yt-dlp (`pip install yt-dlp` or binary)
2. Create 3 templates (new files, safe)
3. Build `ObsidianCaptureServer.ts` (new file, safe)
4. Build `MigrateVaultFrontmatter.ts` (new file, safe)
5. Fix `ObsidianInboxRouter.ts` (small targeted edits)
6. Update QuickAdd `data.json` (backup first)
7. **`--dry-run` migration** — review output, confirm before live run
8. **Live migration** (approval gate — await confirmation)
9. Stop old server, start new server, create systemd service
10. E2E curl tests

---

## Files Changed

| File | Action |
|---|---|
| `06 Toolkit/Templates/Capture Template.md` | CREATE |
| `06 Toolkit/Templates/Meeting Template.md` | CREATE |
| `06 Toolkit/Templates/Note Template.md` | CREATE |
| `06 Toolkit/Templates/_*.md` (5 old templates) | RENAME (archive) |
| `.obsidian/plugins/quickadd/data.json` | UPDATE (backed up first) |
| `PAI/Tools/ObsidianCaptureServer.ts` | CREATE |
| `PAI/Tools/MigrateVaultFrontmatter.ts` | CREATE |
| `PAI/Tools/ObsidianInboxRouter.ts` | EDIT (3 targeted changes) |
| `~/.config/systemd/user/ObsidianCaptureServer.service` | CREATE |

---

## Verification

- `curl -X POST http://localhost:27337/voice-note -d '{"transcription":"test"}'` → 200, file in 00 INBOX
- `curl -X POST http://localhost:27337/capture -d '{"text":"hello"}'` → 200, file in 00 INBOX
- `curl http://localhost:27337/` → HTML form visible
- `rg "^type:" vault/02\ Cards/ | sort | uniq -c` → only meeting/note/pai-session
- ExcaliBrain graph opens without errors
- `systemctl --user status ObsidianCaptureServer` → active (running)
