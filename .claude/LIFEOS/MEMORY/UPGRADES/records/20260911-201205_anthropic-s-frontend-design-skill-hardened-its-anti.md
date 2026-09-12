---
id: 20260911-201205_anthropic-s-frontend-design-skill-hardened-its-anti
slug: anthropic-s-frontend-design-skill-hardened-its-anti
status: applied
source: upgrade-skill
created: 2026-09-11T20:12:05.072Z
expires: 2026-10-11T20:12:05.072Z
confidence: 0.6
target_surface: skill
session_id: 
ledger_id: 
evidence:
  - "github.com/anthropics/skills commit 41bbe19 (PR #1713) diff read 2026-09-11"
---

## Claim

Anthropic's frontend-design skill hardened its anti-generic-defaults language; LifeOS visual skills lack the equivalent

## Current State

skills/VisualInfographic and VisualBlueprint carry style rules but no explicit 'name the default treatment and only use it if best' construct; Webdesign delegates to this very plugin

## Recommendation

Port the named-default-treatment pattern into VisualBlueprint/VisualInfographic: name the cliche explicitly so the model can avoid it, rather than only describing the wanted style

## Notes

- 2026-09-11T20:12:05.072Z — created (source: upgrade-skill)
- 2026-09-11T21:29:15.722Z — applied: skills/VisualInfographic/SKILL.md:130 — named-default-treatment gotcha
