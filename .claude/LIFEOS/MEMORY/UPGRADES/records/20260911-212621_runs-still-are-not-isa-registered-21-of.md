---
id: 20260911-212621_runs-still-are-not-isa-registered-21-of
slug: runs-still-are-not-isa-registered-21-of
status: recommended
source: upgrade-skill
created: 2026-09-11T21:26:21.078Z
expires: 2026-10-11T21:26:21.078Z
confidence: 0.85
target_surface: doctrine
session_id: 
ledger_id: 
evidence:
  - "work.json read 2026-09-11 (1/22 with ISA); AlgorithmNudge.hook.ts:240; supersedes 20260902-205834 whose one-week behavioural prediction was falsified"
---

## Claim

Runs still are not ISA-registered: 21 of 22 work.json sessions have no ISA, so every ISA-gated surface stays dark

## Current State

ReflectionGate (cfda99e) fixed the reflection SYMPTOM by not depending on the ISA field, so reflections now flow. The registration gap itself is untouched: AlgorithmNudge.hook.ts:240 isTrackedRow() still requires a non-empty isa, work.json still shows 1 of 22 sessions with one, and mid-run nudges plus the ascent phase strip stay dark for unregistered runs

## Recommendation

Decide deliberately between two readings: either substantial work should genuinely scaffold an ISA (behavioural, and two scans have now failed to produce it), or the ISA-gated surfaces should key off something a native session actually has. Do not add a third workaround — ReflectionGate was one, and stacking more hides the gap instead of closing it

## Notes

- 2026-09-11T21:26:21.078Z — created (source: upgrade-skill)
