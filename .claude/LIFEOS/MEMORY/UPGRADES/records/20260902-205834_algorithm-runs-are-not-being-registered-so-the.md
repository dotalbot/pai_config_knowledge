---
id: 20260902-205834_algorithm-runs-are-not-being-registered-so-the
slug: algorithm-runs-are-not-being-registered-so-the
status: recommended
source: upgrade-skill
created: 2026-09-02T20:58:34.034Z
expires: 2026-10-02T20:58:34.034Z
confidence: 0.9
target_surface: doctrine
session_id: 
ledger_id: 
evidence:
  - "work.json read 2026-09-02; ascent.ts native-phase definition; AlgorithmNudge.hook.ts row-eligibility rule rules out a nudge row"
---

## Claim

Algorithm runs are not being registered, so the learn step and reflections never fire

## Current State

work.json holds 11 entries; only one (2026-08-20 migration) has an ISA attached. Today's two-day session of substantial work is logged phase=native, which current-work-dir.ts:93 defines as untracked. algorithm-reflections.jsonl last written 2026-06-12.

## Recommendation

BEHAVIOURAL, not code. The DA must run the Algorithm loop for substantial work as the system prompt requires. Re-check work.json in one week: if runs are still unregistered under real use, it is a system problem and earns a mechanism. Building enforcement now would encode a workaround for a behavioural lapse.

## Notes

- 2026-09-02T20:58:34.034Z — created (source: upgrade-skill)
