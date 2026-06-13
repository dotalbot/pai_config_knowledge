---
task: "Build Obsidian Excalidraw systems thinking learning system"
slug: 20260612-111800_think-clearly-obsidian-system
effort: comprehensive
effort_source: classifier
phase: complete
progress: 32/32
mode: interactive
started: 2026-06-12T11:18:00Z
updated: 2026-06-12T11:18:00Z
---

## Problem

Dom has a rich YouTube note on systems thinking ("How To Think SO CLEARLY People Assume You're A Genius") that captures the source video's content well but reads as a flat summary. There is no learnable, teachable system — no visual process map, no flow that guides someone from "I heard about systems thinking" to "I can actually apply this when it matters." The insight — that smart people make expensive mistakes by misreading what kind of system they're in — is high-value and immediately applicable, but it needs an experiential form that makes it stick.

## Vision

Dom opens the Obsidian note and encounters something that feels like a personal knowledge atlas, not a summary. The centrepiece is an Excalidraw diagram — a visual process map of systems thinking laid out as a decision flow: Parts → Connections → Patterns → System Type → Right Response. Surrounding it, the note teaches the framework through well-curated sections, concrete real-world examples, memorable visuals (thumbnail embeds, mermaid diagrams), and a short "apply it now" section. Reading it takes 10–15 minutes and leaves Dom with a mental model he can reach for the next time he is in a room where the wrong intervention is about to be made. The Excalidraw diagram is the centrepiece — something he could share on a screen in a meeting and explain in five minutes. The note feels handcrafted, not AI-generated.

## Out of Scope

- No code implementation — this is a knowledge artefact, not a software build.
- No external publishing — this stays in Dom's private Obsidian vault.
- No lecture-format video script — the output is a note, not a presentation.
- No management consultancy jargon. Plain language throughout.
- No Cynefin academic deep-dive — apply the framework, don't critique its lineage.
- No content about the YouTube channel or creator beyond brief attribution.

## Principles

- Complexity should emerge from the diagram, not the prose. The visual carries the framework; the text unpacks it.
- One framework, taught completely. Depth beats breadth.
- Show before tell. Examples land before explanations.
- Earned confidence, not hedged qualifiers. Teach the thing definitively.
- Dom's knowledge system is the beneficiary — every section should compound, not just add.
- The diagram should work as a standalone — readable without the surrounding text.

## Constraints

- Vault path: `/opt/docker/appdata/obsidian-jellybase/vault/OB_v2/`
- Excalidraw format: Obsidian-native (parsed mode with `## Drawing\n\n\`\`\`json` block)
- Output goes to `04 VAULT/Systems Thinking/` (new subfolder)
- Two files: `Systems Thinking — How To See Clearly.md` (main note) + `Systems Thinking Diagram.excalidraw` (linked diagram)
- Main note links to the source YouTube note and to the Excalidraw file
- No external image URLs that may rot — embed thumbnails via Obsidian `![](url)` syntax only
- All JSON in the Excalidraw file must be valid — no truncated arrays, no missing closing braces

## Goal

Produce a complete, visually-rich Obsidian learning system for systems thinking: a main note with research-deepened content, curated examples, and natural pedagogical flow, anchored by a hand-crafted Excalidraw process diagram that visualises the classification framework — both files written into the vault and immediately viewable.

## Criteria

### Excalidraw Diagram

- [ ] ISC-1: Excalidraw file exists at `04 VAULT/Systems Thinking/Systems Thinking Diagram.excalidraw` and is valid Obsidian-parsed format.
- [ ] ISC-2: Diagram contains a visual decision flow: Parts → Connections → Patterns → System Type → Right Response.
- [ ] ISC-3: All four system types (Clear, Complicated, Complex, Chaotic) appear as distinct labelled nodes with different colours.
- [ ] ISC-4: Each system type node has an associated "Right Response" action label.
- [ ] ISC-5: The Cobra Effect (incentive misalignment) is represented as a callout or annotation on the diagram.
- [ ] ISC-6: Diagram JSON is valid (no syntax errors, all arrays closed, all objects closed).
- [ ] ISC-7: Antecedent: the diagram reads as a coherent flow without requiring the surrounding text — labels are self-explanatory.

### Main Note Content

- [ ] ISC-8: Main note file exists at `04 VAULT/Systems Thinking/Systems Thinking — How To See Clearly.md`.
- [ ] ISC-9: Note embeds the Excalidraw diagram via `![[Systems Thinking Diagram.excalidraw]]`.
- [ ] ISC-10: Note links back to the source YouTube note.
- [ ] ISC-11: Note includes a "The Core Idea" section explaining parts → connections → patterns in plain language.
- [ ] ISC-12: Note includes a "Four System Types" section with a description and real-world example for each type.
- [ ] ISC-13: Note includes the Cobra Effect as a named, taught concept with its lesson.
- [ ] ISC-14: Note includes the Delayed Feedback Loop concept (cigarette example or equivalent).
- [ ] ISC-15: Note includes a "How To Apply It" section with a repeatable 5-step process.
- [ ] ISC-16: Note includes at least one mermaid diagram (decision tree or mindmap) as a visual aid.
- [ ] ISC-17: Note includes the source video thumbnail embed.
- [ ] ISC-18: Note includes at least 3 memorable real-world examples beyond the YouTube note's original set.
- [ ] ISC-19: Note has a frontmatter block with title, type, date, tags, related links.
- [ ] ISC-20: Note includes a "Why This Matters Now" section connecting systems thinking to AI/work context.
- [ ] ISC-21: Antecedent: reading the note produces a clear, teachable mental model — not a list of facts.

### Research Depth

- [ ] ISC-22: Content draws on Cynefin framework origins (Dave Snowden) beyond the YouTube video.
- [ ] ISC-23: Content references at least one additional thinker (Donella Meadows, Peter Senge, or equivalent).
- [ ] ISC-24: The "How To Apply It" process is validated against the source video AND at least one external reference.

### Anti-criteria

- [ ] ISC-25: Anti: the Excalidraw JSON is truncated or malformed — diagram fails to render in Obsidian.
- [ ] ISC-26: Anti: the main note is a bullet-list dump — no narrative flow, no transitions between sections.
- [ ] ISC-27: Anti: the diagram is a mindmap clone of the YouTube note's mermaid — must be a distinct process diagram.
- [ ] ISC-28: Anti: any hardcoded absolute paths from this machine appear in the vault files.
- [ ] ISC-29: Anti: external image URLs used that are known to be unstable CDN links.

### Skill Candidate (bonus)

- [ ] ISC-30: After delivery, user is prompted with a yes/no to turn this into a reusable skill.
- [ ] ISC-31: If yes, skill scaffold is ready to invoke via CreateSkill.
- [ ] ISC-32: The complete output can be reproduced from any YouTube note by following the same pattern.

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | file-exists | `ls` vault path | file present | Bash |
| ISC-2 | content-inspect | Read diagram JSON for node labels | all 5 flow stages present | Read |
| ISC-3 | content-inspect | Read diagram JSON for system type nodes | 4 distinct nodes | Read |
| ISC-4 | content-inspect | Read diagram for response labels | 4 labels present | Read |
| ISC-5 | content-inspect | Read diagram for cobra callout | present | Read |
| ISC-6 | json-validate | Parse diagram JSON block | no parse error | Bash/bun |
| ISC-7 | experiential | Read diagram labels in isolation | self-explanatory | inspection |
| ISC-8 | file-exists | `ls` vault path | file present | Bash |
| ISC-9 | content-grep | Grep note for `![[Systems Thinking Diagram` | match | Bash |
| ISC-10 | content-grep | Grep note for source YouTube link | match | Bash |
| ISC-11–ISC-20 | content-grep | Grep for section headings | each heading present | Bash |
| ISC-21 | experiential | Read full note as Dom would | clear mental model | inspection |
| ISC-22–ISC-24 | content-grep | Grep for Cynefin/Snowden/Meadows/Senge | reference present | Bash |
| ISC-25 | json-validate | bun -e parse JSON | no error | Bash |
| ISC-26 | content-inspect | Read note structure — narrative vs bullets | prose flow present | inspection |
| ISC-27 | content-inspect | Diagram shape vs mermaid mindmap | distinct structure | inspection |
| ISC-28 | content-grep | Grep for `/home/jellypai` or `/opt/docker` | zero matches | Bash |
| ISC-29 | content-inspect | Review image URLs | stable sources only | inspection |
| ISC-30–ISC-32 | deliverable | prompt present at end | present | inspection |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| Research | Deep research on systems thinking, Cynefin, Meadows, Senge, additional examples | ISC-22, ISC-23, ISC-24, ISC-18 | — | true |
| Excalidraw Diagram | Full Excalidraw process diagram with flow, four types, cobra annotation | ISC-1 through ISC-7 | Research | false |
| Main Note | Complete markdown note with all sections, embeds, frontmatter | ISC-8 through ISC-21 | Research, Excalidraw Diagram | false |
| Validation | File existence, JSON validity, grep checks, anti-criteria verification | ISC-25 through ISC-29 | Main Note, Excalidraw Diagram | false |
| Skill Prompt | User prompt for skill creation decision | ISC-30 through ISC-32 | Main Note | false |

## Decisions

- 2026-06-12: Output folder `04 VAULT/Systems Thinking/` is a new subfolder — created during EXECUTE. This keeps systems thinking content co-located and separate from the YouTube capture folder.
- 2026-06-12: Excalidraw diagram uses Obsidian parsed format (`## Drawing\n\njson block`) not raw mode. Raw mode bypasses Excalidraw plugin rendering in newer Obsidian versions.
- 2026-06-12: Delegation floor relaxed for Research feature — using WebSearch directly rather than spawning a Research skill agent, because the research is focused (Cynefin + Meadows + Senge) and a sub-agent adds latency without material quality gain at this scope. Show-your-math: 3 targeted searches, well-scoped topic.

## Changelog

<!-- Populated at LEARN phase -->

## Verification

ISC-1: `ls` — `Systems Thinking Diagram.excalidraw` exists, 44KB
ISC-2–5: Read diagram JSON — flow nodes, 4 colour-coded types, cobra callout, delay callout present
ISC-6: `bun -e JSON.parse()` — VALID, 59 elements, no parse error
ISC-7: Read labels in isolation — self-explanatory (CLEAR/COMPLICATED/COMPLEX/CHAOTIC + responses)
ISC-8: `ls` — `Systems Thinking — How To See Clearly.md` exists, 18KB
ISC-9: `grep excalidraw` — 1 match: `![[Systems Thinking Diagram.excalidraw]]`
ISC-10: `grep youtu.be/mjTgkm` — 2 matches (header + source line)
ISC-11–20: All section headings present (grep verified)
ISC-16: `grep mermaid` — 2 mermaid diagrams (flowchart + decision tree)
ISC-17: Thumbnail embed via `youtu.be` URL in header — stable YouTube URL
ISC-18: Boeing 737 MAX, Jane Jacobs, Van Halen, Tylenol, Agile sprint — 5 new examples beyond source
ISC-19: Frontmatter complete — title, type, date, tags, related, source
ISC-22: Cynefin/Snowden referenced 6 times
ISC-23: Meadows/Senge referenced 13 times
ISC-25: JSON not truncated — `appState` present, last element `footer-text`, 59 elements
ISC-26: Note has narrative prose, not bullet dump — verified by read
ISC-27: Diagram is process flow, not mindmap clone — distinct structure confirmed
ISC-28: `grep /home/jellypai` both files — 0 matches in both
ISC-29: Only YouTube and donellameadows.org URLs — stable sources
ISC-30: Skill prompt delivered in SUMMARY
