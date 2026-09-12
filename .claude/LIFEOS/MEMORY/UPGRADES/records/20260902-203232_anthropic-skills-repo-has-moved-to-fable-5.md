---
id: 20260902-203232_anthropic-skills-repo-has-moved-to-fable-5
slug: anthropic-skills-repo-has-moved-to-fable-5
status: rejected
source: upgrade-skill
created: 2026-09-02T20:32:32.984Z
expires: 2026-10-02T20:32:32.984Z
confidence: 0.55
target_surface: settings
session_id: 
ledger_id: 
evidence:
  - "https://github.com/anthropics/skills/commit/53048666b05b4799081517d00e09e0a2dd688678"
---

## Claim

Anthropic skills repo has moved to Fable 5.1 / Mythos 5.1; LifeOS models.ts still pins claude-fable-5

## Current State

LIFEOS/TOOLS/models.ts:71 pins fable: 'claude-fable-5'. Anthropic skills commit 5304866 (2026-09-01) updates the claude-api skill for Fable 5.1 / Mythos 5.1

## Recommendation

Verify whether claude-fable-5-1 (or similar) is a live ID via the models overview, then bump with UpdateModels.ts --apply fable <id>. Do NOT bump on the commit title alone.

## Notes

- 2026-09-02T20:32:32.984Z — created (source: upgrade-skill)
- 2026-09-11T21:28:07.465Z — rejected
