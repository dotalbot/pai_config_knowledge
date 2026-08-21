---
task: Promote Excalidraw design system to Knowledge + scaffold Excalidraw skill
slug: excalidraw-design-skill-setup
effort: E3
phase: complete
progress: 21/21
mode: algorithm
started: 2026-06-06T00:00:00Z
updated: 2026-06-07T00:00:00Z
---

## Problem

The decoded High Level Business Sequence Flow design system exists only in an ephemeral ISA work artifact. Every future session that builds a new sequence diagram must re-decode the source `.excalidraw` file (150KB JSON parse, ~10min overhead). There is no skill to route that request, no knowledge doc to load, and no blank template to copy.

## Vision

Dom asks "build me a High Level Business Sequence Flow diagram for X" and the system has everything it needs within the first tool call: design values loaded from KNOWLEDGE in seconds, skill workflow guiding the build, blank template ready to stamp content into. The overhead is content, not archaeology. Future sessions are 5 minutes, not 20.

## Out of Scope

- Building additional diagram types (matrix, org chart, Gantt) — this is the first pattern only
- Converting the knowledge doc into a CLI tool
- Publishing the skill publicly (may be private — decision in PLAN)
- Modifying the existing completed diagram

## Constraints

- Knowledge doc format must match KNOWLEDGE frontmatter contract (type, tags, created, quality, status)
- Skill must follow PAI flat-folder convention (max 2 levels, Workflows/ only for executables)
- skills/CLAUDE.md mandates Skill("CreateSkill") invocation for all new skill directory creation
- Skill naming must reflect the PATTERN not the tool: "High Level Business Sequence Flow"
- Blank template must be valid `.excalidraw` native JSON (not `.excalidraw.md` wrapper)

## Goal

Produce: (1) a compact KNOWLEDGE doc capturing the full decoded design system, (2) an Excalidraw skill with routing and one workflow for the High Level Business Sequence Flow pattern, (3) a blank template `.excalidraw` file ready to stamp content into, and (4) a SKILLCUSTOMIZATIONS file with Dom's vault path — so future sessions load the design system in seconds.

## Criteria

- [x] ISC-1: Knowledge doc exists at `PAI/MEMORY/KNOWLEDGE/Design/HighLevelBusinessSequenceFlow.md`
- [x] ISC-2: Knowledge doc frontmatter has type, tags, created, quality, status fields
- [x] ISC-3: Knowledge doc contains all 5 phase colours with hex values
- [x] ISC-4: Knowledge doc contains the full typography scale (8 font sizes)
- [x] ISC-5: Knowledge doc contains stage card anatomy (6-element breakdown with offsets)
- [x] ISC-6: Knowledge doc contains zone layout table (4 zones with y-positions)
- [x] ISC-7: Knowledge doc contains global rules section (roughness, fontFamily, roundness)
- [x] ISC-8: Knowledge doc references the populated example + source files
- [x] ISC-9: Skill dir exists at `skills/Excalidraw/`
- [x] ISC-10: `skills/Excalidraw/SKILL.md` exists with valid frontmatter (name, description)
- [x] ISC-11: SKILL.md description triggers on "high level business sequence flow" and synonyms
- [x] ISC-12: SKILL.md has a Workflow Routing table pointing to CreateHighLevelBusinessSequenceFlow.md
- [x] ISC-13: SKILL.md has a Gotchas section
- [x] ISC-14: Workflow file exists at `skills/Excalidraw/Workflows/CreateHighLevelBusinessSequenceFlow.md`
- [x] ISC-15: Workflow file references the KNOWLEDGE doc path
- [x] ISC-16: SKILLCUSTOMIZATIONS file exists at `PAI/USER/SKILLCUSTOMIZATIONS/Excalidraw/PREFERENCES.md` with vault path
- [x] ISC-17: Blank template exists at vault `03 Spaces/Work/Excalidraw/Templates/High Level Business Sequence Flow - Template.excalidraw`
- [x] ISC-18: Blank template is valid JSON
- [x] ISC-19: Blank template has 8 stage cards with placeholder text ("Stage N", "Role", "Description")
- [x] ISC-20: Blank template uses correct phase colour sequence (blue→cyan→purple→purple→orange→orange→green→green)
- [x] ISC-21: Anti: SKILL.md contains no hardcoded vault paths (those live in SKILLCUSTOMIZATIONS)

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | file | find path | exists | Bash |
| ISC-2..8 | content | Read doc, grep fields | present | Read/Bash |
| ISC-9..14 | file/content | find + Read SKILL.md | present + correct | Bash/Read |
| ISC-15 | content | Read workflow, grep KNOWLEDGE path | present | Read |
| ISC-16 | file | find SKILLCUSTOMIZATIONS path | exists | Bash |
| ISC-17..20 | file/parse | find + python3 json.load | exists + valid | Bash |
| ISC-21 | anti | rg vault path in SKILL.md | 0 matches | Bash |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| Knowledge doc | Design system knowledge file in KNOWLEDGE/Design/ | ISC-1..8 | — | false |
| Excalidraw skill | SKILL.md + workflow via Skill("CreateSkill") | ISC-9..15 | Knowledge doc | false |
| SKILLCUSTOMIZATIONS | Dom's vault path overlay | ISC-16 | Excalidraw skill | false |
| Blank template | 8-stage placeholder .excalidraw in vault Templates/ | ISC-17..20 | Knowledge doc | true |
