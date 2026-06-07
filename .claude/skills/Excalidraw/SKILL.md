---
name: Excalidraw
description: "Builds professional Excalidraw diagrams using PAI design templates. Patterns: High Level Business Sequence Flow (stage cards, conveyor belt metaphor, phase colour system, cross-cutting controls). Saves .excalidraw native JSON format to vault. Loads design system from KNOWLEDGE before generating. USE WHEN: high level business sequence flow, business process diagram, sequence diagram, excalidraw diagram, create diagram, build diagram, stage flow diagram, process flow, governance diagram, lifecycle diagram. NOT FOR data flow diagrams, system architecture diagrams, entity relationship diagrams, UML (use other diagramming tools for those)."
effort: medium
---

# Excalidraw

Builds professional Excalidraw diagrams using PAI design patterns. The design system values — colours, spacing, typography, element schemas — are loaded from KNOWLEDGE before generation so the session never needs to re-decode source files.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/Excalidraw/`

If this directory exists, load and apply:
- `PREFERENCES.md` — vault paths, default stage count, default template

These override default behavior. If the directory does not exist, prompt the user for vault path before executing.

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the Excalidraw skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **Excalidraw** skill to ACTION...
   ```

## Workflow Routing

| Pattern | Trigger | Workflow |
|---------|---------|----------|
| **High Level Business Sequence Flow** | "high level business sequence flow", "sequence diagram", "process diagram", "stage flow", "governance lifecycle", "business process" | `Workflows/CreateHighLevelBusinessSequenceFlow.md` |

## Quick Reference

- Design system for all patterns lives at `PAI/MEMORY/KNOWLEDGE/Design/` — load it, never re-decode source files
- Stock template (blank, 8-stage): `{vault}/03 Spaces/Work/Excalidraw/Templates/High Level Business Sequence Flow - Template.excalidraw`
- Populated example: `{vault}/03 Spaces/Work/Excalidraw/Enterprise AI Use Case Lifecycle.excalidraw`
- File format: always `.excalidraw` native JSON — never `.excalidraw.md` Obsidian wrapper
- Verify with `python3 -c "import json; json.load(open('<path>'))"` before claiming done

## Gotchas

**These are the non-obvious failure modes. Claude gets these wrong without explicit guidance.**

- **roughness MUST be 0 on every element.** Excalidraw's default roughness is >0 (hand-drawn style). Setting roughness=0 is what makes the diagram look professional rather than sketchy. A single element with roughness=1 is visible and breaks the style.
- **fontFamily MUST be 1 on every text element.** Other fontFamily values (2, 3) render differently in Obsidian's Excalidraw plugin vs excalidraw.com and produce inconsistent results. The KNOWLEDGE doc specifies fontFamily=1; don't deviate.
- **Save as `.excalidraw` not `.excalidraw.md`.** The `.excalidraw.md` format is Obsidian's markdown wrapper — it embeds the JSON but adds frontmatter and a code fence. It fails to open cleanly in excalidraw.com. Save pure JSON as `.excalidraw`.
- **Load the KNOWLEDGE doc before generating.** The design system values (hex colours, pixel offsets, font sizes, element schema) are in `PAI/MEMORY/KNOWLEDGE/Design/HighLevelBusinessSequenceFlow.md`. Do not guess these values from memory — load the doc. Every session starts with fresh context; the values are not cached.
- **All rects need `roundness: {"type": 3}`.** Excalidraw uses `null` roundness for sharp corners. Missing the roundness field or setting it to null gives square cards that look wrong against the design system. Every rectangle in these diagrams uses `{"type": 3}`.
- **Text elements need all required fields.** Missing `containerId`, `originalText`, `lineHeight`, `autoResize`, `hasTextLink`, or `rawText` causes silent rendering failures in some Excalidraw versions. Copy the full text element schema from the KNOWLEDGE doc.
- **Phase colours are fixed per pattern, not per preference.** The colour sequence (blue→cyan→purple→purple→orange→orange→green→green for 8 stages) encodes the phase grouping. Adjacent same-colour stages are sub-phases of one macro-phase. Don't randomise colours.
- **The blank template is a starting point, not a finished diagram.** It has placeholder text. The workflow step is: copy template → replace placeholder content → verify → save as new named file. Never overwrite the template itself.
