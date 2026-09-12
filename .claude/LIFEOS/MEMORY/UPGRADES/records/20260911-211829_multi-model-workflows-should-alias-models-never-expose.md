---
id: 20260911-211829_multi-model-workflows-should-alias-models-never-expose
slug: multi-model-workflows-should-alias-models-never-expose
status: applied
source: upgrade-skill
created: 2026-09-11T21:18:29.360Z
expires: 2026-10-11T21:18:29.360Z
confidence: 0.5
target_surface: rule
session_id: 
ledger_id: 
evidence:
  - "YouTube: IndyDevDan 'Intelligence EXPLOSION' (rqZHR-hRllI) ~25%/~45%: 'You can never reveal the name of the model to the other model, otherwise they'll start emitting weird behavior'"
---

## Claim

Multi-model workflows should alias models, never expose real model names to each other

## Current State

No alias rule anywhere in OPERATIONAL_RULES, Council, or Agents. The research fan-out roster names providers openly (DeepSeek, OpenRouter, Gemini) and Council composes agents without hiding model identity

## Recommendation

When several distinct models collaborate or debate, give each an opaque codename. Reported effect otherwise is competitive or sabotaging behaviour between models. Cheap to apply in Council and the research fan-out

## Notes

- 2026-09-11T21:18:29.360Z — created (source: upgrade-skill)
- 2026-09-11T21:25:01.608Z — applied: LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md:52 — new Multi-model work section
