---
id: 20260911-211829_tell-agents-to-run-a-cli-s-help
slug: tell-agents-to-run-a-cli-s-help
status: applied
source: upgrade-skill
created: 2026-09-11T21:18:29.385Z
expires: 2026-10-11T21:18:29.385Z
confidence: 0.45
target_surface: doctrine
session_id: 
ledger_id: 
evidence:
  - "YouTube: Developers Digest (xOC9PQmpcyU): 'run the dash-dash help command to learn how to use it'; also HeyGen-Help in kGOIQ2b8Myg"
---

## Claim

Tell agents to run a CLI's --help rather than documenting its flags in the skill file

## Current State

No --help discovery rule in the system prompt, Philosophy, or Prompting/Standards. Skills hard-code tool contracts, which the Ideal-State Prompting doctrine explicitly protects as a keep-class

## Recommendation

For NEW or fast-moving CLIs, instruct self-discovery via --help instead of pinning flags that rot. Sits in tension with the tool-contract keep-class, so scope it to tools whose interface changes, not stable ones

## Notes

- 2026-09-11T21:18:29.385Z — created (source: upgrade-skill)
- 2026-09-11T21:25:01.631Z — applied: skills/Prompting/Standards.md:45 — scoped to volatile CLIs, keep-class preserved
