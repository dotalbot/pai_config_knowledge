---
id: 20260911-212807_models-ts-pins-claude-fable-5-fable-5
slug: models-ts-pins-claude-fable-5-fable-5
status: recommended
source: upgrade-skill
created: 2026-09-11T21:28:07.439Z
expires: 2026-10-11T21:28:07.439Z
confidence: 0.7
target_surface: settings
session_id: 
ledger_id: 
evidence:
  - "models.ts:71 read 2026-09-11; /v1/models probe attempted and blocked on missing key; environment model listing"
---

## Claim

models.ts pins claude-fable-5; Fable 5.1 shipped and its ID is claude-fable-5-1, but the pin cannot be verified from this machine

## Current State

LIFEOS/TOOLS/models.ts:71 pins fable: 'claude-fable-5'. The harness environment names claude-fable-5-1 as the current Fable, and Anthropic's channel published 'Introducing Claude Fable 5.1'. No ANTHROPIC_API_KEY in ~/.claude/.env, so /v1/models cannot be probed to confirm the exact string or whether the old ID still resolves

## Recommendation

Low risk either way: an alias that still resolves costs nothing, a dead ID fails loudly on first use. Either bump models.ts:71 to claude-fable-5-1 and let the next Inference.ts call prove it, or add an API key so the pin can be probed rather than guessed. Do not pin a string nobody has verified

## Notes

- 2026-09-11T21:28:07.439Z — created (source: upgrade-skill)
