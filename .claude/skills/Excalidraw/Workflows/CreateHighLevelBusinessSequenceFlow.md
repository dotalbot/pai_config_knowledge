# CreateHighLevelBusinessSequenceFlow

Creates a professional High Level Business Sequence Flow diagram in Excalidraw format using the PAI design system. Output: a validated `.excalidraw` file ready to open in Obsidian.

---

## Step 1: Load the Design System

**Read the design system first — do not proceed without it.**

```
Read: PAI/MEMORY/KNOWLEDGE/Design/HighLevelBusinessSequenceFlow.md
```

This file contains: all hex colours, pixel offsets, font sizes, zone layout, element schema, global rules (roughness=0, fontFamily=1, roundness type 3). Every value used in Steps 5–6 comes from this doc.

---

## Step 2: Load Vault Path from SKILLCUSTOMIZATIONS

```
Read: PAI/USER/SKILLCUSTOMIZATIONS/Excalidraw/PREFERENCES.md (if exists)
```

Extract:
- `diagrams_path` — where to save the finished diagram
- `templates_path` — where the blank template lives

If PREFERENCES.md does not exist, ask the user for their vault path before continuing.

---

## Step 3: Content Brief

Before generating, collect the content. Present this brief to the user and wait for their input:

```
## Content Brief — High Level Business Sequence Flow

**Process name:** [e.g. "Enterprise AI Use Case Lifecycle"]
**Subtitle:** [e.g. "From idea to live operation — v1.0"]
**Operating principle:** [1–2 sentences on the core governance rule]

**Stage count:** [default: 8]
**Phase colour assignment:** [default: blue, cyan, purple, purple, orange, orange, green, green]

For each stage:
| # | Stage Name | Role / Owner | Description (what it produces/decides) |
|---|-----------|--------------|----------------------------------------|
| 1 |           |              |                                        |
| 2 |           |              |                                        |
| ... |         |              |                                        |

**Belt label:** [what moves along the conveyor]

**Cross-cutting controls:** [default: 6]
| # | Control Name | Description |
|---|-------------|-------------|
| 1 |             |             |
| ... |           |             |

**Footnote text:** [key exceptions, assumptions, or decisions]
```

If the user provides a topic but not individual stage details, generate realistic content for their domain using the design system's phase colour logic as a guide. Confirm with the user before generating the file.

---

## Step 4: Check for Blank Template

Look for the blank template at the path from PREFERENCES.md (default: `{templates_path}/High Level Business Sequence Flow - Template.excalidraw`).

If present: use it as the structural starting point — all element IDs and positions are already correct; you only need to replace placeholder text content.

If absent: generate the full element JSON from scratch using the design system values.

---

## Step 5: Generate the .excalidraw JSON

Apply the exact design values from the KNOWLEDGE doc (Step 1). Key invariants:

| Property | Value | On what |
|----------|-------|---------|
| `roughness` | `0` | ALL elements |
| `fontFamily` | `1` | ALL text elements |
| `roundness` | `{"type": 3}` | ALL rectangle elements |
| `type` (file) | `"excalidraw"` | Top-level |
| `version` (file) | `2` | Top-level |
| `viewBackgroundColor` | `"#f6f8fb"` | appState |
| `theme` | `"light"` | appState |

**Phase colour rule:** assign colours from the KNOWLEDGE doc's Phase Colour System table. Adjacent stages of the same colour are sub-phases.

**Stage card x positions:** `x = 70 + (stage_index × 260)` (0-indexed)

**Between-stage arrows:** `x = card_x + 208`, `y = 275`, `width = 28`, `strokeColor = "#7d8ea3"`

**Belt arrow:** `x = 76`, `y = 452`, `strokeWidth = 4`, `strokeColor = "#6c7f95"`, `width = last_card_x + 190 + 76`

---

## Step 6: Write the File

Save to `{diagrams_path}/{Process Name}.excalidraw` — pure JSON, no markdown wrapper.

---

## Step 7: Verify

Run all three checks before marking done:

```bash
# 1. Valid JSON
python3 -c "import json; d=json.load(open('<path>')); print(f'OK — {len(d[\"elements\"])} elements')"

# 2. No roughness violations
python3 -c "
import json
d=json.load(open('<path>'))
bad=[e for e in d['elements'] if e.get('roughness',0)>0]
print(f'roughness violations: {len(bad)}')
"

# 3. No fontFamily violations
python3 -c "
import json
d=json.load(open('<path>'))
bad=[e for e in d['elements'] if e['type']=='text' and e.get('fontFamily',1)!=1]
print(f'fontFamily violations: {len(bad)}')
"
```

Expected output: `OK — N elements`, `roughness violations: 0`, `fontFamily violations: 0`.

If any violation: fix before proceeding. Never claim done without running these checks.

---

## Adding a New Pattern

To add a second diagram type to this skill (e.g. Process Matrix, Journey Map):

1. Create a KNOWLEDGE doc at `PAI/MEMORY/KNOWLEDGE/Design/{PatternName}.md` with the decoded design values
2. Create `skills/Excalidraw/Workflows/Create{PatternName}.md` following this file as a template
3. Add a row to the Workflow Routing table in `skills/Excalidraw/SKILL.md`
4. Add the new trigger phrases to the SKILL.md description frontmatter
