---
id: 20260911-202931_driftreminder-enforces-response-structure-but-has-no-banned
slug: driftreminder-enforces-response-structure-but-has-no-banned
status: applied
source: upgrade-skill
created: 2026-09-11T20:29:31.224Z
expires: 2026-10-11T20:29:31.224Z
confidence: 0.65
target_surface: hook
session_id: 
ledger_id: 
evidence:
  - "YouTube: IndyDevDan 'FIXING Opus 5' (S_QdQ1G4GlU), transcript 2026-09-11; hooks/DriftReminder.hook.ts grep"
---

## Claim

DriftReminder enforces response structure but has no banned-phrase check for Opus 5 verbal tics

## Current State

hooks/DriftReminder.hook.ts (253 lines) checks banner, closer, em-dash count and prose-line cap; no phrase list. 'load-bearing' appears repeatedly in LifeOS prose

## Recommendation

Add a small banned-phrase list to DriftReminder (load-bearing, worth stating plainly, here's the honest truth) — the model-specific tics that structural checks cannot catch

## Notes

- 2026-09-11T20:29:31.224Z — created (source: upgrade-skill)
- 2026-09-11T21:29:15.699Z — applied: hooks/lib/banned-vocab.ts — 4 Opus 5 tics added to the existing 106-entry list (the mechanism already existed; the tics did not)
