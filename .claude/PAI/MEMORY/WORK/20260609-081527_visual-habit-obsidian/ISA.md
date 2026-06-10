---
task: "Build visual learning habit system in Obsidian"
slug: 20260609-081527_visual-habit-obsidian
effort: advanced
effort_source: classifier
phase: complete
progress: 28/35
mode: interactive
started: 2026-06-09T08:15:27Z
updated: 2026-06-09T08:25:00Z
---

## Problem

Dom wants to build a daily visual learning habit using Obsidian + Excalidraw, anchored around a specific image that carries personal meaning. The YouTube video "My Visual Daily Note-Taking Workflow in Obsidian 🎨 | Excalidraw & GTD" represents the aspiration. Without a concrete system, the habit will not form — the blank canvas moment kills ADHD-brain before it starts, the image will become wallpaper without a written narrative, and the system will be designed but never used.

## Vision

Opening Obsidian each day shows the anchor image immediately — no searching, no decisions. One tap starts today's canvas, which opens pre-seeded with three starter nodes to eliminate blank-canvas paralysis. Five minutes later Dom closes it and feels slightly proud. After two weeks, the hub note shows a growing archive of visual captures — visible evidence of a thinking practice forming. The YouTube aspiration video is there as direction, not as guilt. The narrative under the image is in Dom's own words: why this image, what it means, what season of thinking this represents.

## Out of Scope

Complex GTD workflow integration (capture → process → organise → review cycle) is not part of this habit foundation — that is Phase 2. Full Excalidraw mastery and elaborate visual systems are aspirational, not the starting point. Mobile sync configuration, plugin installation guidance, and Obsidian setup from scratch are excluded. Automated AI analysis of visual captures is future work.

## Principles

- The minimum viable ritual wins. A 5-minute session that actually happens beats a 30-minute one that doesn't.
- Gap tolerance is non-negotiable. Habit systems that punish skipped days kill themselves — ADHD means irregular patterns, not failure.
- The image does the motivational work. Every other element in the system serves to surface the image and reduce time-to-canvas.
- Narrative precedes structure. Dom writes "why this image" before using the system once, or the image becomes decoration.
- One real capture on Day 1 is more valuable than perfect system design.

## Constraints

- Obsidian vault path: `/opt/docker/appdata/obsidian-jellybase/vault/OB_v2/`
- Uses existing vault structure — no new top-level folders
- Existing `Sketch your mind` folder is the canonical capture destination
- Existing daily note template patterns (Templater, meta-bind) must be respected
- Image URL has expired — Dom must reshare before it can be embedded
- PAI notification system is at localhost:31337

## Goal

Create an Obsidian-based visual habit system where the anchor image is the entry point, a daily capture template eliminates blank-canvas paralysis, and PAI sends a daily trigger notification — so Dom can start a visual thinking session in under 30 seconds from seeing the notification.

## Criteria

### Hub Note
- [ ] ISC-1: Hub note exists at `03 Spaces/Learning/🎨 Visual Learning Hub.md`
- [ ] ISC-2: Hub note frontmatter has `type: hub`, `topic: visual-learning`, `created:` field
- [ ] ISC-3: Image embedded at top of hub note via `![[visual-habit-anchor.png]]` (pending reshare)
- [ ] ISC-4: "North Star" section exists with YouTube video link and brief aspiration description
- [ ] ISC-5: "Why This Image" section exists with Dom's personal narrative (placeholder on creation, Dom fills in)
- [ ] ISC-6: "Start Today" meta-bind button exists and creates capture note from template in one click
- [ ] ISC-7: Dataview query shows last 7 visual captures with dates as a growing archive
- [ ] ISC-8: Hub note linked from `03 Spaces/Learning.md` or Learning MOC
- [ ] ISC-9: "Current Season" section exists for Dom to name what he's exploring this month
- [ ] ISC-10: Antecedent: Image + "Start Today" button visible above the fold on hub note without scrolling

### Daily Template
- [ ] ISC-11: Template file exists at `06 Toolkit/Templates/Visual Learning Daily.md`
- [ ] ISC-12: Template frontmatter auto-fills `date:` via Templater `<% tp.date.now() %>`
- [ ] ISC-13: Template has parent backlink `[[🎨 Visual Learning Hub]]`
- [ ] ISC-14: Template saves new notes to `03 Spaces/Learning/Sketch your mind/` folder
- [ ] ISC-15: Template includes 3 pre-seeded visual prompt questions (not a blank canvas)
- [ ] ISC-16: Template includes embedded Excalidraw canvas `![[<% tp.file.title %>.excalidraw]]`
- [ ] ISC-17: Template has minimal 3-question reflection at bottom (≤3 questions)
- [ ] ISC-18: Template has `minimum-viable: true` marker — 3 nodes on canvas = done

### Capture Structure
- [ ] ISC-19: Capture files named `YYYY-MM-DD Visual.md` (date-named, flat, no nested week/month)
- [ ] ISC-20: Captures are gap-tolerant — no streak field that requires manual reset
- [ ] ISC-21: Capture notes auto-tag with `#My/Visual/Daily`

### YouTube Reference
- [ ] ISC-22: YouTube note exists at `04 VAULT/YouTube/Visual Daily Workflow Obsidian Excalidraw GTD.md`
- [ ] ISC-23: YouTube note has video link, title, and 3-sentence description of what Dom aspires toward
- [ ] ISC-24: Hub note links to YouTube note via `[[Visual Daily Workflow Obsidian Excalidraw GTD]]`

### Image Handling
- [ ] ISC-25: Image file saved to `06 Toolkit/Images/visual-habit-anchor.png` (BLOCKED — needs reshare)
- [ ] ISC-26: Image embedded via local vault path, not external URL
- [ ] ISC-27: Anti: Image embedded as remote URL that can expire — only local attachment allowed

### PAI Integration
- [ ] ISC-28: PAI daily notification configured with message that includes hub note deeplink
- [ ] ISC-29: Hub note has PAI notification setup instructions in a collapsible callout
- [ ] ISC-30: Weekly reflection prompt exists in hub note under "Weekly Pulse" section

### Friction & ADHD
- [ ] ISC-31: Daily canvas has 3 pre-placed seed prompts to prevent blank-canvas paralysis
- [ ] ISC-32: Anti: Daily capture requires naming file or making decision before canvas opens (Templater handles naming)
- [ ] ISC-33: Anti: Hub note buried >2 folder levels from vault root (it's at `03 Spaces/Learning/`)
- [ ] ISC-34: Anti: System requires Obsidian configuration changes before first use
- [ ] ISC-35: Narrative section "Why This Image" has a non-blank placeholder so Dom knows exactly what to write

## Test Strategy

| ISC | Type | Check | Threshold | Tool |
|-----|------|-------|-----------|------|
| ISC-1 | file existence | Read the file path | file present | Read |
| ISC-2 | frontmatter | Read frontmatter block | type/topic/created present | Read |
| ISC-3 | embed | Read hub note for `![[visual-habit-anchor` | line present | Grep |
| ISC-4 | section | Read hub note for `## North Star` heading | section present | Read |
| ISC-5 | section | Read hub note for `## Why This Image` heading | section present | Read |
| ISC-6 | button | Read hub note for `meta-bind-button` block | button definition present | Read |
| ISC-7 | dataview | Read hub note for `dataview` query | query block present | Grep |
| ISC-11 | file existence | Read template path | file present | Read |
| ISC-12 | templater | Read template for `tp.date.now()` | expression present | Grep |
| ISC-16 | excalidraw | Read template for excalidraw embed line | expression present | Grep |
| ISC-22 | file existence | Read YouTube note path | file present | Read |
| ISC-25 | file existence | Read image path | file present OR blocked note present | Read |
| ISC-27 | anti | Grep hub note for http/https image embed | zero matches | Grep |
| ISC-32 | anti | Read template for manual filename field | no such field | Read |
| ISC-35 | content | Read "Why This Image" section | non-empty placeholder | Read |

## Features

| Name | Description | Satisfies | Depends On | Parallelizable |
|------|-------------|-----------|------------|----------------|
| hub-note | Visual Learning Hub note — image anchor, North Star, start button, archive | ISC-1–10 | image (blocked) | no |
| daily-template | Templater template for daily visual captures | ISC-11–18 | hub-note | yes |
| capture-structure | Naming convention, folder, tagging for captures | ISC-19–21 | daily-template | yes |
| youtube-note | YouTube reference note + hub link | ISC-22–24 | hub-note | yes |
| image-embed | Local image file + embed in hub note | ISC-25–27 | BLOCKED: reshare | no |
| pai-integration | PAI notification + weekly reflection | ISC-28–30 | hub-note | yes |
| friction-elimination | Seed prompts, anti-naming, anti-burial | ISC-31–35 | daily-template | yes |

## Decisions

- 2026-06-09: Image URL expired before I could fetch it — YouTube video identified as "My Visual Daily Note-Taking Workflow in Obsidian 🎨 | Excalidraw & GTD". Proceeding with full system build; image embed section has placeholder awaiting Dom to reshare.
- 2026-06-09: Used existing `Sketch your mind` folder for captures — Dom already has this, preserving prior structure.
- 2026-06-09: Delegation floor check — ISA Skill + BeCreative meet E3 ≥2 soft floor. No Forge needed (no TypeScript code).
- 2026-06-09: refined: ISC-10 and ISC-17 merged into single Antecedent ISC — both stated "image visible above fold", ISC-10 kept as canonical.
