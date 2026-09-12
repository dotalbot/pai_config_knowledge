---
id: 20260911-201205_webdesign-skill-md-states-the-frontend-design-plugin
slug: webdesign-skill-md-states-the-frontend-design-plugin
status: applied
source: upgrade-skill
created: 2026-09-11T20:12:05.046Z
expires: 2026-10-11T20:12:05.046Z
confidence: 0.9
target_surface: skill
session_id: 
ledger_id: 
evidence:
  - "plugins/installed_plugins.json read 2026-09-11; skills/Webdesign/SKILL.md:88"
---

## Claim

Webdesign SKILL.md states the frontend-design plugin is already installed, but it is not installed on this machine

## Current State

skills/Webdesign/SKILL.md:88 says the plugin auto-activates and is 'already installed in the official marketplace'; installed_plugins.json holds only code-review, firecrawl, pr-review-toolkit

## Recommendation

Correct the gotcha to say the plugin is AVAILABLE in the marketplace but must be installed, or install it; as written the skill tells the DA not to invoke something that will never fire

## Notes

- 2026-09-11T20:12:05.046Z — created (source: upgrade-skill)
- 2026-09-11T21:27:39.901Z — applied: skills/Webdesign/SKILL.md:88 — corrected available-vs-installed
