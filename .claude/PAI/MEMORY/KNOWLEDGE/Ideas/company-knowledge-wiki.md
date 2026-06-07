---
title: "Company Knowledge Wiki — Extending Karpathy's Personal Wiki to Team Scale"
type: Ideas
tags: [knowledge-management, enterprise-ai, meetings, obsidian, adhd, agent-registry, pai-philosophy, knowledge-wiki]
created: 2026-06-04
updated: 2026-06-04
quality: 7
status: seedling
source_url: ""
source_author: "CEO of Grain.com (YouTube)"
related:
  - slug: ai-will-replace-knowledge-workers
    type: extends
  - slug: daniel-miessler
    type: related
---

# Company Knowledge Wiki — Extending Karpathy's Personal Wiki to Team Scale

**Source:** YouTube video featuring the CEO of Grain.com — Karpathy-inspired personal wiki extended to the team/company context.

## Thesis

Meetings are the true operating context of any company — not documentation. A company knowledge wiki built from meeting transcripts (and other source material) beats real-time MCP retrieval because it is cheaper, richer, and already semantically connected. Raw files are sacred and append-only; the wiki is a compiled layer that can always be rebuilt from them.

## Architecture

Two distinct layers:

1. **Raw layer** — transcripts, source material, web clippings, manual drops. Append-only, never overwritten. Sacred.
2. **Wiki layer** — synthesised entities: companies, people, projects, topics. Compiled from the raw layer. Queryable, navigable, always rebuildable.

Entity types mirror the PAI Knowledge schema: companies, people, projects, topics.

## Sources

- Meeting transcripts via Grain
- Intercom (customer conversations)
- Web clippings
- Manual drops

## Interface

- Claude Code in VS Code querying markdown files directly
- Same vault synced to Obsidian for visual knowledge graph

## Key Pattern — Surfacing Blind Spots

Ask the wiki to surface gaps between:
- How strategy is communicated (from leadership transcripts)
- How the team actually understands it (from team meeting transcripts)

Evidence comes from real meeting transcripts — not surveys, not conjecture.

## Practical Starting Point

Start with one source (meetings). Append-only, never overwrite raw. Grow from there.

## Multiplayer Frontier

Shared GitHub repo that every team member writes to — collaborative, version-controlled, queryable.

## Implications

- Pre-synthesised wikis dominate real-time MCP retrieval for established knowledge: lower cost, richer context, already linked
- The architecture directly validates [[ai-will-replace-knowledge-workers]] — the "articulation problem" Miessler identifies is solved here by treating meeting transcripts as the primary articulation channel
- Raw-layer sanctity is the key insight that makes this durable: you can always recompile the wiki, you cannot regenerate lost raw data
- Claude Code + markdown files is a zero-infrastructure interface — no vector DB, no API, no latency overhead

## Relevance to Dominic's Work

- **Obsidian usage**: This is the explicit architecture for Dominic's existing Obsidian vault — raw layer + wiki layer maps directly to how the vault should be structured
- **ADHD knowledge organisation (G2)**: Pre-synthesised, always-connected wiki reduces the cognitive overhead of knowledge retrieval — directly addresses the goal
- **Enterprise AI adoption strategy**: Companies that build this first compound advantage; the raw-layer/wiki-layer split is a defensible, rebuilable moat
- **Agent Registry project**: The wiki layer's entity schema (companies, people, projects) maps onto the Agent Registry context capture requirement — agents need exactly this kind of pre-synthesised org context
