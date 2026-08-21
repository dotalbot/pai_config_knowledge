---
title: "High Level Business Sequence Flow — Excalidraw Design System"
type: Design
tags: [excalidraw, diagram, template, sequence, business-process, design-system, governance, pai-template]
created: 2026-06-06
updated: 2026-06-06
quality: 9
status: evergreen
related:
  - slug: enterprise-ai-use-case-lifecycle
    type: example-implementation
---

# High Level Business Sequence Flow — Excalidraw Design System

Presents a business process as a horizontal sequence of colour-coded stage cards, connected by a conveyor belt metaphor, with cross-cutting controls below and a footnote annotation zone. Decoded from `major_version_target_operating_model_governance_v0.4.excalidraw` (Dom's governance TOM).

**When to use:** Any process that moves left-to-right through defined stages, where each stage has an owner and a deliverable, and cross-cutting concerns (governance, risk, compliance) apply across all stages.

**Skill:** `Skill("Excalidraw", "Create High Level Business Sequence Flow for [topic]")`
**Stock template:** `03 Spaces/Work/Excalidraw/Templates/High Level Business Sequence Flow - Template.excalidraw`
**Populated example:** `03 Spaces/Work/Excalidraw/Enterprise AI Use Case Lifecycle.excalidraw`

---

## Canvas

| Property | Value |
|----------|-------|
| Background | `#f6f8fb` |
| Theme | `light` |
| Header nav colour | `#0b2545` (navy) |
| Accent text on dark | `#d8e6f7` (light blue) |
| Body text | `#5d6b7a` (slate) |
| Neutral border | `#d5dce5` |

---

## Layout Zones (4 horizontal bands, fixed y-positions)

| Zone | Element | y-start | Height | Notes |
|------|---------|---------|--------|-------|
| 0 | Header bar | y=40 | 60px | Navy fill, title + subtitle + operating principle |
| 1 | Stage cards | y=180 | 190px | Main horizontal sequence |
| 2 | Conveyor belt | y=452 | 4px stroke | Belt arrow + label below |
| 3 | Cross-cutting controls | y=545 | 210px | Outer container + header bar + control cards |
| 4 | Footnote | y=825 | 110px | Outer rect + heading + body text |

---

## Stage Card Anatomy (6 elements per card)

Cards are 190×190px, positioned on a **260px stride** (70px gap between cards). First card at x=70.

| Element | x offset | y offset | Size | Colour rule |
|---------|----------|----------|------|-------------|
| Outer rect | 0 | 0 | 190×190 | fill=white, stroke=phase-colour, strokeWidth=2 |
| Accent bar | +26 | +18 | 138×17 | fill=phase-colour, solid |
| Stage name | +26 | +52 | — | color=#0b2545, fontSize=20 |
| Role / owner text | +26 | +100 | — | color=phase-colour, fontSize=12 |
| Divider line | +26 | +126 | width=138 | strokeColor=#d5dce5, strokeWidth=1 |
| Description | +26 | +142 | — | color=#5d6b7a, fontSize=11 |

**x position for card N (0-indexed):** `x = 70 + (N × 260)`

---

## Between-Stage Arrows (N-1 arrows for N stages)

| Property | Value |
|----------|-------|
| x | card_x + 208 (right edge of card + 18px gap) |
| y | 275 (vertical centre of card row) |
| width | 28 |
| strokeColor | `#7d8ea3` |
| endArrowhead | `"arrow"` |
| roundness | none |

---

## Phase Colour System

| Colour | Hex | Typical phase meaning |
|--------|-----|-----------------------|
| Blue | `#0f6ccb` | Initiation, approval, demand |
| Cyan | `#00a6c8` | Capture, analysis, intake |
| Purple | `#6f3cc3` | Readiness, design, assessment, ethics |
| Orange | `#e96b00` | Build, test, execute, iterate |
| Green | `#3f8e22` | Release, live, operate, scale, sustain |

**Typical 8-stage assignment:** blue → cyan → purple → purple → orange → orange → green → green

Stages sharing a phase colour represent sub-phases within the same macro-phase.

---

## Conveyor Belt (Zone 2)

| Property | Value |
|----------|-------|
| x | 76 (aligns with first card left margin) |
| y | 452 |
| width | (last_card_x + 190 + 76) — fills full stage row |
| strokeWidth | 4 |
| strokeColor | `#6c7f95` |
| Label y | ~470 |
| Label fontSize | 15 |
| Label color | `#5d6b7a` |

Label describes the delivery principle: "Each gate produces evidence before the next stage begins."

---

## Cross-Cutting Controls (Zone 3)

| Element | y | Height | Width | Colour |
|---------|---|--------|-------|--------|
| Outer container | 545 | 210 | matches stage row | fill=white, stroke=#b0bec5 |
| Header bar | 563 | 34 | full width | fill=#0b2545 |
| Header label | — | — | — | white, fontSize=18, "Cross-Cutting Controls" |
| Control cards | 613 | 92 | (row_width / N_controls) - 20px gap | fill=phase-colour (rotated) |
| Control title | +8 | +8 | — | phase-colour (darker), fontSize=16 |
| Control detail | +8 | +36 | — | #152a44, fontSize=11 |

Cards gap: 20px between cards. First card x = outer_x + 20.

---

## Header Zone (Zone 0)

| Element | Position | Value |
|---------|----------|-------|
| Navy bar | y=40 | height=60, fill=#0b2545, full width |
| Title | y=65 | fontSize=28, color=white, textAlign=left |
| Subtitle | y=82 | fontSize=13, color=#d8e6f7 |
| Operating principle box | top-right | stroke=#0b2545, fill=white, fontSize=15 |

---

## Typography Scale

| Size | Element |
|------|---------|
| 28px | Diagram title (white on navy) |
| 20px | Stage names (color=#0b2545) |
| 18px | Section headings (white on navy header bars) |
| 16px | Control card titles (phase colour) |
| 15px | Conveyor label, operating principle text |
| 13px | Subtitle (color=#d8e6f7 on navy) |
| 12px | Role/owner lines (phase colour) |
| 11px | Card descriptions (#5d6b7a), control detail text (#152a44) |

---

## Global Rules (MANDATORY — ALL elements)

| Rule | Value | Why |
|------|-------|-----|
| `roughness` | `0` | Professional clean rendering, not hand-drawn |
| `fontFamily` | `1` | System default; other values render differently |
| `roundness` | `{"type": 3}` | Rounded corners on all rects |
| `fillStyle` | `"solid"` | Solid fills, not hatched or cross-hatched |
| `type` | `"excalidraw"` | Required top-level field |
| `version` | `2` | Required top-level field |

---

## File Format

Save as `.excalidraw` (pure JSON), **not** `.excalidraw.md` (Obsidian markdown wrapper).

The `.excalidraw` format opens natively in Obsidian + Excalidraw plugin and in excalidraw.com.

---

## Decoded Source

Original file: `00 INBOX/major_version_target_operating_model_governance_v0.4.excalidraw`
Process: "Copilot Studio Agent Governance - Target Operating Model", 10 stages, v0.4
Decoded: 2026-06-06 — all values above were extracted from this file's raw JSON
