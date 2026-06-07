---
task: Build hypothetical Excalidraw diagram using vault TOM design language
slug: excalidraw-ai-lifecycle-template
effort: E3
phase: complete
progress: 12/12
mode: algorithm
started: 2026-06-06T00:00:00Z
updated: 2026-06-06T00:00:00Z
---

## Problem

No stock template exists in Excalidraw format that faithfully reproduces the visual design language of the vault's governance TOM diagram. The design language (stage cards, phase colour system, conveyor belt metaphor, cross-cutting controls band) has been decoded but not yet instantiated as a reusable example. Dom wants to see the template demonstrated with a real hypothetical process before adopting it as a stock method.

## Vision

Dom opens the file in Obsidian and sees a professional, executive-grade diagram that is immediately indistinguishable in quality from his existing governance TOM. The hypothetical process (Enterprise AI Use Case Lifecycle) is realistic enough to be useful as a reference, and the design language is so faithfully reproduced that a future diagram author could treat this file as a copy-paste template. Euphoric surprise: the diagram looks like something Dom would have spent hours hand-crafting, delivered by the system in minutes.

## Out of Scope

- Animation, frames, or zoomable viewport features
- Multiple diagrams or variants in one file
- Connecting arrows between cross-cutting controls and specific stages
- Populating a real client or project — this is a hypothetical illustrative process only
- Converting the file to a presentable slide or image

## Constraints

- Must use `.excalidraw` native JSON format (not `.excalidraw.md` Obsidian wrapper) to match the source file format
- All design values (colours, font sizes, spacing, roughness=0) must be derived exclusively from the decoded source file — no invented values
- File must open without errors in Obsidian with the Excalidraw plugin
- Must be saved to `03 Spaces/Work/Excalidraw/` — not the INBOX

## Goal

Produce a complete, valid `.excalidraw` file for "Enterprise AI Use Case Lifecycle" — an 8-stage hypothetical AI governance process diagram — using the exact design language decoded from `major_version_target_operating_model_governance_v0.4.excalidraw`, demonstrating the template as a reusable stock method for presenting sequences.

## Criteria

- [x] ISC-1: File exists at `03 Spaces/Work/Excalidraw/Enterprise AI Use Case Lifecycle.excalidraw`
- [x] ISC-2: File is valid JSON parseable without error
- [x] ISC-3: `type` field equals `"excalidraw"` and `version` equals `2`
- [x] ISC-4: Header navy bar present at y=40, fill=#0b2545, matching source
- [x] ISC-5: Title text "Enterprise AI Use Case Lifecycle" present at fontSize=28, white
- [x] ISC-6: All 8 stage cards present at 190×190 with 260px stride
- [x] ISC-7: Each stage card has outer rect, accent bar, stage name, role text, divider line, description text (6 elements per card = 48 total)
- [x] ISC-8: All 7 between-stage arrows present at y=275, color #7d8ea3, width=28
- [x] ISC-9: Phase colour grouping correct — blue→cyan→purple→purple→orange→orange→green→green
- [x] ISC-10: Belt arrow present at y=452, strokeWidth=4, color #6c7f95
- [x] ISC-11: Belt label text present below the arrow
- [x] ISC-12: Cross-cutting controls outer container present with navy header bar and white label text
- [x] ISC-13: All 6 control cards present inside controls container, using phase colours
- [x] ISC-14: Footnote annotation zone present at y=825 with heading and body text
- [x] ISC-15: roughness=0 on all rectangle and text elements (clean, not hand-drawn)
- [x] ISC-16: roundness type 3 on all rect elements (rounded corners)
- [x] ISC-17: Canvas background #f6f8fb matches source
- [x] ISC-18: Anti: No element uses roughness > 0 — confirmed: 0 violations
- [x] ISC-19: Anti: No element uses fontFamily other than 1 — confirmed: 0 violations
- [x] ISC-20: Antecedent: The diagram contains enough realistic content (stage names, roles, descriptions) that it reads as a credible working document, not a placeholder
- [x] ISC-21: Operating principle box present top-right with label and principle text
- [x] ISC-22: appState includes viewBackgroundColor #f6f8fb and theme "light"

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | file | `find` target path | file exists | Bash |
| ISC-2 | parse | `python3 -c "import json; json.load(open(...))"` | no exception | Bash |
| ISC-3 | content | Read file, check type/version | exact match | Read |
| ISC-4..22 | content | Read file, grep/inspect elements array | presence + values | Read/Bash |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| Header zone | Title bar, title text, subtitle, operating principle box | ISC-3,4,5,21 | — | false |
| Stage cards | All 8 stage cards with 6 elements each, phase colours, correct positions | ISC-6,7,9,15,16 | Header zone | false |
| Stage connectors | 7 between-stage arrows | ISC-8 | Stage cards | false |
| Belt layer | Belt arrow + label at y=452 | ISC-10,11 | Stage cards | false |
| Controls band | Outer container, header bar, 6 control cards | ISC-12,13 | Belt layer | false |
| Footnote | Outer rect, heading, body text | ISC-14 | Controls band | false |
| AppState | Canvas theme, background, zoom | ISC-17,22 | — | true |

## Verification

| ISC | Evidence |
|-----|----------|
| ISC-1 | `find` confirms file at `03 Spaces/Work/Excalidraw/Enterprise AI Use Case Lifecycle.excalidraw` |
| ISC-2 | `python3 -c "import json; json.load(open(...))"` — no exception |
| ISC-3 | `type: "excalidraw"`, `version: 2` confirmed via Read |
| ISC-4 | Header rect at y=40, backgroundColor=#0b2545, width=2174 confirmed |
| ISC-5 | Title text "Enterprise AI Use Case Lifecycle" at fontSize=28, strokeColor=#ffffff confirmed |
| ISC-6 | 8 stage rects at width=190, height=190, x-stride=260 confirmed via grep |
| ISC-7 | 87 total elements: 27 rects, 44 texts, 8 arrows — 6 elements × 8 cards = 48 card elements confirmed |
| ISC-8 | 7 arrow elements confirmed at y=275, strokeColor=#7d8ea3, width=28 |
| ISC-9 | Stage colours confirmed: Idea Capture=#0f6ccb, Feasibility=#00a6c8, Ethics/Pilot=#6f3cc3, Build/Compliance=#e96b00, Platform/Scale=#3f8e22 |
| ISC-10 | Belt arrow at y=452, strokeWidth=4, strokeColor=#6c7f95, width=2014 confirmed |
| ISC-11 | Belt label text present: "AI delivery conveyor: each gate produces evidence before the next stage begins" |
| ISC-12 | Controls container with navy header bar (backgroundColor=#0b2545) and "Cross-Cutting Controls" label confirmed |
| ISC-13 | 6 control cards confirmed at y=613, h=92, using correct phase colours |
| ISC-14 | Footnote rect at y=825, h=110, with heading and body text confirmed |
| ISC-15 | roughness=0 on all elements — confirmed: 0 violations |
| ISC-16 | roundness={type:3} on all rects — confirmed |
| ISC-17 | appState.viewBackgroundColor=#f6f8fb confirmed |
| ISC-18 | Anti: bad_roughness count = 0 — PASS |
| ISC-19 | Anti: bad_fontFamily count = 0 — PASS |
| ISC-20 | Stage names: Idea Capture, Feasibility, Ethics Screen, Pilot Gate, Build & Test, Compliance Gate, Platform Release, Scale / Operate — all realistic, with roles and descriptions |
| ISC-21 | Operating principle box present top-right; text: "Governance gates produce evidence. Every stage movement requires a verified record." |
| ISC-22 | appState: viewBackgroundColor=#f6f8fb, theme="light" confirmed |
