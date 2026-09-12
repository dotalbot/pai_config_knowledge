---
id: 20260911-205913_satisfactioncapture-s-directive-leg-repeats-the-phrase-match
slug: satisfactioncapture-s-directive-leg-repeats-the-phrase-match
status: applied
source: upgrade-skill
created: 2026-09-11T20:59:13.970Z
expires: 2026-10-11T20:59:13.970Z
confidence: 0.8
target_surface: hook
session_id: 
ledger_id: 
evidence:
  - "Upgrades.ts list --json 2026-09-11 (16 directive records read); SatisfactionCapture.hook.ts:267-282"
---

## Claim

SatisfactionCapture's directive leg repeats the phrase-match failure: one-off requests are stored as standing rules

## Current State

hooks/SatisfactionCapture.hook.ts:267 DIRECTIVE_PATTERNS matches 'from now on'/'going forward'/'in the future' with no artifact or intent gate. 16 directive records exist; several are one-off asks ('So is it going to be working in the future?', 'please provide me a simple scp script') not standing rules

## Recommendation

Apply the same admission test used for learning capture: reject questions, reject one-off task requests, require imperative phrasing. Reuse rejectLearning's artifact markers from hooks/lib/learning-utils.ts

## Notes

- 2026-09-11T20:59:13.970Z — created (source: upgrade-skill)
- 2026-09-11T21:25:58.579Z — applied: isNonDirectiveIntent gate added (commit 344da6b); 7 of 16 false directives pruned from the store
