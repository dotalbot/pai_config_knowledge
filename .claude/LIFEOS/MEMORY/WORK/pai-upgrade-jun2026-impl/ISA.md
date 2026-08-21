---
task: PAI Upgrade June 2026 — Implementation
slug: pai-upgrade-jun2026-impl
effort: E3
phase: complete
progress: 0/36
mode: algorithm
started: 2026-06-11T00:00:00Z
updated: 2026-06-11T00:00:00Z
---

## Problem

18 PAI upgrade actions identified by the June 11 PAIUpgrade workflow run remain unimplemented. 3 are CRITICAL: Stop hooks (DocIntegrity, WorkCompletionLearning) run silently with no additionalContext feedback back into sessions; PATTERNS.yaml lacks three bypass-escape patterns (backslash, IFS, tar-pipe); troubleshooting docs don't mention --safe-mode. Additionally, the Chief Architect v3 JD exists as a file in /home/jellypai/Shared/documents/ but is not in the Obsidian vault.

## Vision

After this session, PAI's infrastructure is measurably stronger: Stop hooks surface violation/learning summaries back into the conversation context; PATTERNS.yaml blocks three new exfiltration bypass patterns; settings.json gains fallback model, exec-form hooks, continueOnBlock, and version guard; HookSystem.md and related docs have the --safe-mode troubleshooting step and bg-exec sanctioned pattern; and the JD is findable from Obsidian's Work space. Each change is verifiable by Read or Grep. The upgrade backlog shrinks from 18 to ≤4 (deferred low-priority items).

## Out of Scope

MEDIUM items 10 (MessageDisplay hook), 11 (post-session hook), and 13 (sub-agent 5-level nesting) that require creating net-new hooks or extensive doc rewrites are deferred to a follow-up session. The LOW item voice ID drift alignment (item 18) is also deferred. The Chief Architect JD is placed in Obsidian as-is — no further content edits.

## Principles

- Patch the infrastructure, not the notes — every behavioural rule lives in a structured surface (settings.json, PATTERNS.yaml, hook code, docs), not in a memo.
- Self-healing over ceremony — each change should make the system more correct for all future sessions without requiring recall.
- Verify before claiming done — every edit is confirmed by Read or Grep after writing.

## Constraints

- `~/.claude` repo: commits directly to main, no branches.
- TypeScript for all hook code; bun/bunx only.
- Never put auth tokens in URLs.
- settings.json changes must remain valid JSON; verify structure after edit.
- No edits to hook files that would silently break existing behaviour — additionalContext additions are additive, not replacing existing exit(0) paths.

## Goal

All CRITICAL (3) and HIGH (6) PAI upgrade actions are implemented and verified by file read-back or grep evidence; the Chief Architect v3 JD is placed in Obsidian under 03 Spaces/Work/Jobs/; and all changes are committed to the ~/.claude repo.

## Criteria

- [ ] ISC-1: Chief Architect v3 JD note exists at `/opt/docker/appdata/obsidian-jellybase/vault/OB_v2/03 Spaces/Work/Jobs/Chief Architect - Inform Team v3 - 2026-06-11.md`
- [ ] ISC-2: Obsidian note contains the full Role Summary section text from v3
- [ ] ISC-3: `DocIntegrity.hook.ts` returns `hookSpecificOutput.additionalContext` with violation/learning summaries when violations are found
- [ ] ISC-4: `DocIntegrity.hook.ts` `process.exit(0)` call remains present and hook remains non-blocking for clean runs
- [ ] ISC-5: `WorkCompletionLearning.hook.ts` returns `hookSpecificOutput.additionalContext` with learning summaries when significant work was completed
- [ ] ISC-6: `WorkCompletionLearning.hook.ts` original SessionEnd output behaviour unchanged (non-blocking, file writes still occur)
- [ ] ISC-7: PATTERNS.yaml blocked section contains backslash-escape bypass pattern `r\\m` or equivalent
- [ ] ISC-8: PATTERNS.yaml blocked section contains IFS manipulation pattern `IFS=`
- [ ] ISC-9: PATTERNS.yaml blocked section contains archive-pipe exfiltration pattern `tar.*\|.*nc` or equivalent
- [ ] ISC-10: PATTERNS.yaml `version` field updated and `last_updated` set to 2026-06-11
- [ ] ISC-11: `settings.json` PostToolUse ContentScanner entries contain `"continueOnBlock": true`
- [ ] ISC-12: `settings.json` PreToolUse SecurityPipeline Bash entry contains `"args": []`
- [ ] ISC-13: `settings.json` PreToolUse PromptGuard entry contains `"args": []`
- [ ] ISC-14: `settings.json` top-level contains `"fallbackModel"` array with claude-opus-4-8 and claude-sonnet-4-6
- [ ] ISC-15: `settings.json` top-level contains `"requiredMinimumVersion": "2.1.139"`
- [ ] ISC-16: `settings.json` top-level contains `"effortLevel": "standard"`
- [ ] ISC-17: `settings.json` remains valid JSON (bun -e parse check passes)
- [ ] ISC-18: `Inference.ts` contains `thinking_budget` parameter handling for E4/E5 tiers
- [ ] ISC-19: `Inference.ts` contains `effort_level: "xhigh"` or equivalent for E4/E5 tiers
- [ ] ISC-20: `PAI/DOCUMENTATION/Hooks/HookSystem.md` troubleshooting section contains `CLAUDE_CODE_SAFE_MODE=true claude` as Step 0
- [ ] ISC-21: `PAI/ALGORITHM/mode-detection.md` documents `MAX_THINKING_TOKENS=0` for E1/E2 fast-path
- [ ] ISC-22: `settings.json` env block contains `MAX_THINKING_TOKENS` entry documented for E1/E2
- [ ] ISC-23: `PAI/DOCUMENTATION/Agents/AgentSystem.md` contains `--bg --exec` sanctioned pattern subsection
- [ ] ISC-24: `PAI/ALGORITHM/v6.3.0.md` EXECUTE phase contains ISA pivot check gate entry
- [ ] ISC-25: All changes committed to `~/.claude` git repo on main branch
- [ ] ISC-26: ACTIONS.md updated — completed items checked off
- [ ] ISC-27: Anti: No existing hook functionality removed or broken (DocIntegrity still exits 0 on clean runs)
- [ ] ISC-28: Anti: No auth tokens appear in any URL in modified files
- [ ] ISC-29: Anti: settings.json `permissions.allow` array unchanged (no entries removed)
- [ ] ISC-30: Anti: PATTERNS.yaml existing blocked patterns unchanged (no patterns removed)
- [ ] ISC-31: `skills/RootCauseAnalysis/` workflow contains `--safe-mode` Step 0 reference (or note if skill doesn't exist)
- [ ] ISC-32: `PAI/DOCUMENTATION/Agents/AgentSystem.md` contains 5-level sub-agent nesting ceiling documentation
- [ ] ISC-33: `skills/Delegation/SKILL.md` references 5-level nesting ceiling (or note if skill doesn't exist)
- [ ] ISC-34: `PAI/ALGORITHM/v6.3.0.md` OBSERVE preflight section contains inventory re-verify step
- [ ] ISC-35: `PAI/DOCUMENTATION/Security/SecuritySystem.md` contains PATTERNS.yaml smoke-test gate reference
- [ ] ISC-36: ACTIONS.md items 10, 11, 13, 18 remain unchecked (explicitly deferred)

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | file-exists | Read path | file present | Read |
| ISC-2 | content | grep "Most architecture roles" in note | match | Grep |
| ISC-3 | code-content | grep "additionalContext" in DocIntegrity.hook.ts | match | Grep |
| ISC-4 | code-content | grep "process.exit(0)" in DocIntegrity.hook.ts | match | Grep |
| ISC-5 | code-content | grep "additionalContext" in WorkCompletionLearning.hook.ts | match | Grep |
| ISC-6 | code-content | grep "writeFileSync" in WorkCompletionLearning.hook.ts | match (unchanged) | Grep |
| ISC-7 | content | grep bypass pattern in PATTERNS.yaml | match | Grep |
| ISC-8 | content | grep IFS pattern in PATTERNS.yaml | match | Grep |
| ISC-9 | content | grep tar-pipe pattern in PATTERNS.yaml | match | Grep |
| ISC-10 | content | grep "2026-06-11" in PATTERNS.yaml | match | Grep |
| ISC-11 | content | grep "continueOnBlock" in settings.json | match | Grep |
| ISC-12 | content | grep '"args": \[\]' near SecurityPipeline Bash | match | Grep |
| ISC-13 | content | grep '"args": \[\]' near PromptGuard | match | Grep |
| ISC-14 | content | grep "fallbackModel" in settings.json | match | Grep |
| ISC-15 | content | grep "requiredMinimumVersion" in settings.json | match | Grep |
| ISC-16 | content | grep "effortLevel" in settings.json | match | Grep |
| ISC-17 | parse | bun -e 'JSON.parse(fs.readFileSync("settings.json","utf8"))' | no throw | Bash |
| ISC-18 | code-content | grep "thinking_budget" in Inference.ts | match | Grep |
| ISC-19 | code-content | grep "xhigh" in Inference.ts | match | Grep |
| ISC-20 | content | grep "safe-mode" in HookSystem.md | match | Grep |
| ISC-21 | content | grep "MAX_THINKING_TOKENS" in mode-detection.md | match | Grep |
| ISC-22 | content | grep "MAX_THINKING_TOKENS" in settings.json | match | Grep |
| ISC-23 | content | grep "bg.*exec" in AgentSystem.md | match | Grep |
| ISC-24 | content | grep "pivot" in v6.3.0.md | match | Grep |
| ISC-25 | git | git log --oneline -1 shows new commit | present | Bash |
| ISC-26 | content | grep "\[x\]" count ≥ 9 in ACTIONS.md | ≥9 checked | Grep |
| ISC-27 | code-content | grep "process.exit(0)" in DocIntegrity.hook.ts | still present | Grep |
| ISC-28 | content | grep "Bearer" pattern not in URL position | absent from URLs | Read |
| ISC-29 | content | Read settings.json permissions.allow array | unchanged | Read |
| ISC-30 | content | grep first blocked pattern still present | match | Grep |
| ISC-31 | file-check | find RootCauseAnalysis skill, check for safe-mode | present or noted | Bash |
| ISC-32 | content | grep "5" near "nesting" or "level" in AgentSystem.md | match | Grep |
| ISC-33 | file-check | find Delegation/SKILL.md, grep nesting | present or noted | Bash |
| ISC-34 | content | grep "re-verify" or "inventory" in v6.3.0.md OBSERVE | match | Grep |
| ISC-35 | content | grep "smoke" or "regex" in SecuritySystem.md | match | Grep |
| ISC-36 | content | grep unchecked items 10,11,13,18 in ACTIONS.md | 4 unchecked | Grep |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| obsidian-jd | Create Jobs folder in Obsidian, copy v3 JD as note | ISC-1, ISC-2 | — | true |
| patterns-yaml | Add 3 bypass patterns to PATTERNS.yaml blocked section | ISC-7, ISC-8, ISC-9, ISC-10, ISC-30 | — | true |
| settings-json | Add fallbackModel, requiredMinimumVersion, effortLevel, continueOnBlock, args:[] to settings.json | ISC-11, ISC-12, ISC-13, ISC-14, ISC-15, ISC-16, ISC-17, ISC-22, ISC-29 | — | true |
| hook-additionalcontext | Add hookSpecificOutput.additionalContext returns to DocIntegrity and WorkCompletionLearning | ISC-3, ISC-4, ISC-5, ISC-6, ISC-27 | — | false |
| inference-thinking | Add thinking_budget and effort_level params to Inference.ts for E4/E5 | ISC-18, ISC-19 | — | true |
| docs-safemode | Add --safe-mode Step 0 to HookSystem.md troubleshooting + RootCauseAnalysis | ISC-20, ISC-31 | — | true |
| docs-bgexec | Add --bg --exec sanctioned pattern to AgentSystem.md + Delegation/SKILL.md | ISC-23, ISC-32, ISC-33 | — | true |
| docs-algorithm | Add ISA pivot check to EXECUTE, inventory re-verify to OBSERVE in v6.3.0.md | ISC-24, ISC-34 | — | false |
| docs-mode-detection | Document MAX_THINKING_TOKENS=0 in mode-detection.md | ISC-21 | — | true |
| docs-security | Add PATTERNS.yaml smoke-test gate to SecuritySystem.md | ISC-35 | patterns-yaml | false |
| actions-commit | Update ACTIONS.md checkboxes and commit all changes | ISC-25, ISC-26, ISC-28, ISC-36 | all above | false |
