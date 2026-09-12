---
id: 20260911-201152_workflow-tool-fan-outs-are-capped-at-16
slug: workflow-tool-fan-outs-are-capped-at-16
status: applied
source: upgrade-skill
created: 2026-09-11T20:11:52.394Z
expires: 2026-10-11T20:11:52.394Z
confidence: 0.7
target_surface: settings
session_id: 
ledger_id: 
evidence:
  - "Claude Code CHANGELOG v2.1.269; settings.json env block read 2026-09-11; claude-code-guide verification"
---

## Claim

Workflow tool fan-outs are capped at 16 agents by default; UpgradeFanout can silently queue

## Current State

settings.json env sets CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=20 but no Workflow-specific limit; UpgradeFanout.js is the only Workflow-tool caller

## Recommendation

Add CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS to settings.json env (range 1-256, default 16) so the ~8-agent Upgrade fan-out has explicit headroom

## Notes

- 2026-09-11T20:11:52.394Z — created (source: upgrade-skill)
- 2026-09-11T21:27:39.925Z — applied: settings.system.json env CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS=24; settings.json regenerated via MergeSettings
