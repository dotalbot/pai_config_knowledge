---
id: 20260902-203211_fallbackmodel-in-settings-json-pins-two-retired-models
slug: fallbackmodel-in-settings-json-pins-two-retired-models
status: applied
source: upgrade-skill
created: 2026-09-02T20:32:11.482Z
expires: 2026-10-02T20:32:11.482Z
confidence: 0.9
target_surface: settings
session_id: 
ledger_id: 
evidence:
  - "UpdateModels.ts --check run 2026-09-02: 14 STALE pinned IDs, incl. live settings.json"
---

## Claim

fallbackModel in settings.json pins two retired models (claude-opus-4-8, claude-sonnet-4-6)

## Current State

settings.json:90-93 and settings.system.json:93-96 list claude-opus-4-8 and claude-sonnet-4-6 as the fallback chain; registry CURRENT is claude-opus-5 / claude-sonnet-5

## Recommendation

Bump both entries to the current generation, or better, use tier aliases so the chain never rots on the next model release

## Notes

- 2026-09-02T20:32:11.482Z — created (source: upgrade-skill)
- 2026-09-02T20:38:27.625Z — applied
