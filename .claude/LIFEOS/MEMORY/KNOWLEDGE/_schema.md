---
title: "Knowledge Archive Schema"
type: moc
generated: true
---

# Knowledge Archive Schema — kb-v3

> **Generated from `LIFEOS/TOOLS/KnowledgeSchema.ts` — do not edit by hand.**
> Regenerate: `bun ~/.claude/LIFEOS/TOOLS/GenerateKnowledgeSchemaDoc.ts`.
> The code is the single source of truth; `KnowledgeLint.ts` enforces this contract, `MigrateKnowledge.ts` brings old notes onto it, and new notes are born on it via `MemorySystem.renderInitialNote`.

The archive stores **entities** — things you'd look up later. Every note is one of the object types below, carries the **Core Envelope** of flat typed frontmatter, and links to others via typed `related:` edges. Topic is a **tag**, entity is a **type**.

## Object Types

| Type | Directory |
|---|---|
| `person` | `People/` |
| `company` | `Companies/` |
| `idea` | `Ideas/` |
| `blog` | `Blogs/` |
| `research` | `Research/` |
| `book` | `Books/` |

## Core Envelope (every note, every type)

Flat and typed on purpose: flat scalar/list fields query natively in a `kb query` CLI, Obsidian Bases, and Pulse alike (Obsidian Properties have no nested-object type). `related` is the one nested field — a typed-edge list, queryable via `kb`/Dataview.

| Field | Format | Required | Query it unlocks |
|---|---|---|---|
| `id` | text | **yes** | stable link target; survives rename |
| `type` | select (person \| company \| idea \| blog \| research \| book) | **yes** | all companies / all research |
| `title` | text | **yes** | display + alphabetical sort |
| `tags` | list | **yes** | all `security` notes across every type |
| `status` | select (inbox \| seedling \| budding \| evergreen) | no | everything still in the inbox / a seedling |
| `quality` | number | **yes** | stubs to enrich (quality < 3) |
| `quality_inferred` | select (true \| false) | no | which quality scores are backfilled, not human-rated |
| `confidence` | number | no | low-certainty claims to revisit (confidence < 0.5) |
| `source_name` | text | no | everything from a given publication |
| `source_url` | text | no | dedup + canonical link (List-typed for multi-source research) |
| `source_author` | text | no | everything by a given author |
| `source_date` | date | no | everything published in a given year (vs created = archived) |
| `source_kind` | select (blog \| video \| paper \| tweet \| conversation \| bookmark \| internal) | no | all video-derived notes / all tweets |
| `source_session` | text | no | which ISA/session created this note |
| `source_harvest_id` | text | no | which harvest run produced it |
| `created` | date | **yes** | everything added in a given quarter |
| `updated` | date | **yes** | notes untouched in > 1yr (staleness) |
| `valid_from` | date | no | temporal validity start |
| `valid_until` | date | no | temporal validity end (contradiction detector) |
| `related` | related | no | typed-edge graph; every `contradicts` edge (via kb/Dataview, not flat Bases) |
| `convention` | text | **yes** | schema-version / migration-state key (kb-v3) |

## Per-Type Required Fields (beyond the envelope)

| Type | Additional required |
|---|---|
| `person` | — (envelope only) |
| `company` | — (envelope only) |
| `idea` | — (envelope only) |
| `blog` | `source_url`, `source_author`, `source_date` |
| `research` | `source_url` |
| `book` | — (envelope only) |

**Waived for internal notes.** A note with `source_kind: internal` has no external origin — it *is* the primary artifact (an own-prose capture, a design decision, a corpus this system built). Demanding a `source_url` of it asks for a URL that cannot exist, so the `source_*` requirements above are skipped when `source_kind` is `internal`. Externally-sourced notes still must carry their provenance.

A note missing an optional per-type source field (e.g. a research note with no `source_url`) is **envelope-conformant but incomplete** — Lint reports it as an enrichment gap, not a schema failure.

## Controlled Vocabularies

- **`source_kind`**: `blog` · `video` · `paper` · `tweet` · `conversation` · `bookmark` · `internal`
- **`status`**: `inbox` · `seedling` · `budding` · `evergreen`
- **`related.type`** (closed-but-curated): `supports` · `contradicts` · `extends` · `part-of` · `instance-of` · `caused-by` · `preceded-by` · `related` · `derived-from`

Bookmarks are NOT a type: an unprocessed saved URL is `status: inbox` + `source_kind: bookmark` on the type it will become; `ingest` promotes it.

## Querying

```bash
bun ~/.claude/LIFEOS/TOOLS/KnowledgeQuery.ts --source-author "<name>"
bun ~/.claude/LIFEOS/TOOLS/KnowledgeQuery.ts --type idea --tag security --created-after 2026-05
bun ~/.claude/LIFEOS/TOOLS/KnowledgeQuery.ts --related-type contradicts --slugs
bun ~/.claude/LIFEOS/TOOLS/KnowledgeQuery.ts --quality-max 2 --count   # stubs to enrich
bun ~/.claude/LIFEOS/TOOLS/KnowledgeLint.ts                            # conformance
```

The archive is markdown+YAML, so once fields are consistent, Obsidian Bases queries `KNOWLEDGE/` as a database with zero extra code.

## Rationale & History

This contract is the product of a three-dialect migration design pass.
