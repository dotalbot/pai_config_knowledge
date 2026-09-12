---
id: 20260911-203424_reflection-corpus-is-dead-because-reflect-ts-has
slug: reflection-corpus-is-dead-because-reflect-ts-has
status: applied
source: upgrade-skill
created: 2026-09-11T20:34:24.533Z
expires: 2026-10-11T20:34:24.533Z
confidence: 0.85
target_surface: hook
session_id: 
ledger_id: 
evidence:
  - "hooks/AlgorithmNudge.hook.ts:239-241; grep for Reflect.ts callers returns none; work.json sessions read 2026-09-11; algorithm-reflections.jsonl newest 2026-06-12"
---

## Claim

Reflection corpus is dead because Reflect.ts has no automated caller and the nudge that would prompt it is ISA-gated

## Current State

Reflect.ts is a model-invoked CLI: zero callers in hooks/, settings.json or SERVICES. AlgorithmNudge.hook.ts:240 isTrackedRow() requires a non-empty isa field; 21 of 22 work.json sessions have none, so no run is eligible for a nudge. Corpus: 7 entries, newest 2026-06-12, none carrying the schema-9 reflection field (schema 9 landed 2026-07-28)

## Recommendation

Close the loop mechanically: fire Reflect.ts from a session-end hook for any session that did real work, OR relax isTrackedRow so untracked-but-substantial sessions still earn a learn-step nudge. The 2026-09-02 record predicted behaviour would fix this within a week; 9 days on, 21 of 22 sessions are still unregistered, so the behavioural hypothesis is falsified

## Notes

- 2026-09-11T20:34:24.533Z — created (source: upgrade-skill)
- 2026-09-11T21:25:58.554Z — applied: ReflectionGate.hook.ts (commit cfda99e) registered in StopGates; first schema-9 reflection written this session
