---
task: "Route PAI inference calls to OpenCode GPT-5.5"
slug: 20260608-130748_route-inference-to-opencode
effort: advanced
effort_source: classifier
phase: complete
progress: 36/36
mode: interactive
started: 2026-06-08T13:07:48Z
updated: 2026-06-08T13:07:48Z
---

## Problem

All PAI inference calls — Advisor, fast/standard/smart levels — currently bill against Dom's Claude (Anthropic) subscription via `Inference.ts`. Dom has more tokens and credits on his OpenCode/GPT-5.5 subscription and wants to maximize use of that budget. `InferenceOpencode.ts` already exists and is verified working against `localhost:7878`, but is not wired into the Advisor capability or the `Inference.ts` routing path. The result: every advisory call and every internal reasoning call that could be GPT-5.5 is hitting Claude instead.

## Vision

Dom runs a session and the Advisor, fast, standard, and smart inference calls flow through OpenCode/GPT-5.5 by default. The change is transparent — Algorithm phases look the same, Advisor calls happen the same way, the only difference is the model on the other end. Claude token burn drops for inference-type work; the GPT-5.5 credits do the heavy lifting. If OpenCode server is unavailable, the system falls back to Claude gracefully with a logged warning rather than silently failing.

## Out of Scope

Replacing Claude Code itself as the primary DA runtime is not in scope — I (JellyPai) remain the Algorithm executor. Routing hook execution, ISA scaffolding, or format enforcement through OpenCode is not in scope — these are structurally embedded in the Claude Code process. Routing Forge (codex exec) or Anvil (Kimi K2.6) through OpenCode is not in scope — they have their own billing paths. Changing how the mode classifier works (it uses Claude Sonnet via `claude` subprocess) is out of scope for this task. Migrating Inference.ts away from Claude entirely is out of scope — the flag must be opt-in, with Claude as fallback.

## Constraints

- `InferenceOpencode.ts` is the only sanctioned OpenCode call path — no raw fetch to `localhost:7878` from new code.
- TypeScript only, bun runtime.
- OpenCode auth via `OPENCODE_SERVER_PASSWORD` from `.env` — already handled by `InferenceOpencode.ts`.
- The `--opencode` flag must be additive — existing Inference.ts callers without the flag must behave identically to today.
- Anthropic OAuth must not be used for non-Dom paths (already enforced; this change does not affect that boundary).
- `capabilities.md` additions must use verbatim closed-list names or introduce a new entry properly — no phantom capability names.

## Goal

Add an `--opencode` flag to `Inference.ts` so any fast/standard/smart/advisor call can route through OpenCode/GPT-5.5. Update `capabilities.md` to document the OpenCode inference path and change the Advisor invoke to prefer `--opencode`. Add an operational rule to `CLAUDE.md` encoding the preference. Fallback to Claude if OpenCode is unavailable.

## Criteria

- [ ] ISC-1: `Inference.ts` accepts `--opencode` flag without breaking existing callers (no `--opencode` = Claude path unchanged)
- [ ] ISC-2: With `--opencode`, `Inference.ts` calls `InferenceOpencode.ts` instead of the `claude` subprocess
- [ ] ISC-3: `--opencode` works with all levels: `--level fast`, `--level standard`, `--level smart`
- [ ] ISC-4: `--opencode` works with `--mode advisor` (task + state + question → single prompt → InferenceOpencode.ts)
- [ ] ISC-5: If OpenCode server returns `verdict: unavailable`, Inference.ts logs a warning and falls back to Claude
- [ ] ISC-6: Fallback to Claude is logged with a visible warning (stderr or pulse notify), not silent
- [ ] ISC-7: `--opencode` with `--mode advisor --auto-state` works (auto-synthesize state then route to OpenCode)
- [ ] ISC-8: `InferenceOpencode.ts` is invoked via `bun` subprocess (not imported) to preserve its timeout + signal handling
- [ ] ISC-9: The `--slug` argument passed to `InferenceOpencode.ts` is derived from the Inference.ts call context (not hardcoded)
- [ ] ISC-10: Output contract unchanged — Inference.ts `--opencode` emits same stdout format as Claude path
- [ ] ISC-11: `capabilities.md` Advisor entry updated: invoke command references `--opencode` flag
- [ ] ISC-12: `capabilities.md` has a new "OpenCode (GPT-5.5)" entry in the Thinking & Analysis or Delegation table documenting when to prefer it
- [ ] ISC-13: `CLAUDE.md` Operational Rules section has a new rule: prefer `--opencode` for Inference.ts calls at E3+
- [ ] ISC-14: The new CLAUDE.md rule names the fallback behavior (OpenCode unavailable → Claude)
- [ ] ISC-15: `capabilities.md` Advisor closed-list name is unchanged — only the invoke pattern updates (closed list names are immutable without Algorithm minor bump)
- [ ] ISC-16: `bun PAI/TOOLS/Inference.ts --opencode --level fast "sys" "hello"` returns a response without error
- [ ] ISC-17: `bun PAI/TOOLS/Inference.ts --opencode --mode advisor "task" "state" "question"` returns a response without error
- [ ] ISC-18: `bun PAI/TOOLS/Inference.ts --level fast "sys" "hello"` (no `--opencode`) still works identically to pre-change
- [ ] ISC-19: No hardcoded paths in new Inference.ts code — uses `process.env.HOME` or derived paths
- [ ] ISC-20: `InferenceOpencode.ts` is called with `--timeout-ms` matching the level's timeout budget
- [ ] ISC-21: Anti: `--opencode` flag does not cause Inference.ts to import `@anthropic-ai/sdk` or call Anthropic API directly
- [ ] ISC-22: Anti: OpenCode path does not set or use `ANTHROPIC_API_KEY` — billing stays on opencode subscription
- [ ] ISC-23: Anti: Existing hook callers of `Inference.ts` (e.g. `SatisfactionCapture.hook.ts`, `WorkCompletionLearning.hook.ts`) are not broken by this change
- [ ] ISC-24: Anti: `--opencode` is not silently ignored — if passed, OpenCode path is actually taken (verifiable by log or verdict field in output)
- [ ] ISC-25: `Inference.ts` `--json` flag works on `--opencode` path (parses response as JSON)
- [ ] ISC-26: `capabilities.md` change does not introduce any phantom capability name in the closed thinking-capability list
- [ ] ISC-27: The CLAUDE.md rule is in the Operational Rules section, not in comments or prose
- [ ] ISC-28: The new capabilities.md entry documents the OpenCode server URL (`localhost:7878`) and auth source
- [ ] ISC-29: `InferenceOpencode.ts` slug argument is unique per call (timestamp-based) to avoid WORK dir collisions
- [ ] ISC-30: Inference.ts `--opencode` path handles the `verdict: timeout` case from InferenceOpencode.ts and surfaces it as an error
- [ ] ISC-31: Inference.ts `--opencode` path handles the `verdict: error` case from InferenceOpencode.ts and surfaces it as an error
- [ ] ISC-32: `CLAUDE.md` rule specifies E3+ as the threshold for preferring OpenCode (E1/E2 may stay Claude for latency)
- [ ] ISC-33: The advisor prompt built for OpenCode includes task, state, and question clearly labeled so GPT-5.5 interprets it correctly
- [ ] ISC-34: Anti: The `--opencode` default is NOT baked in as a global flag without the user explicitly passing it — the flag is opt-in per call
- [ ] ISC-35: File `PAI/TOOLS/Inference.ts` is modified; `PAI/TOOLS/InferenceOpencode.ts` is not modified
- [ ] ISC-36: Live end-to-end test: `--opencode --level fast` call returns non-empty response from GPT-5.5 within timeout

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | code | `--opencode` flag parsed without error; existing callers unaffected | No error | Read Inference.ts + Bash test |
| ISC-2 | code | `InferenceOpencode.ts` subprocess spawned when `--opencode` set | Subprocess call visible in code | Read |
| ISC-3 | test | Run `--opencode --level fast/standard/smart` | All three return responses | Bash |
| ISC-4 | test | Run `--opencode --mode advisor` | Response returned | Bash |
| ISC-5 | code | Unavailable verdict branch in Inference.ts | Fallback call present | Read |
| ISC-6 | code | Warning log statement in fallback branch | Log/notify call present | Read |
| ISC-7 | test | Run `--opencode --mode advisor --auto-state` | Response returned | Bash |
| ISC-8 | code | `spawn` or `execFile` call to `bun InferenceOpencode.ts` | Present in code | Read |
| ISC-9 | code | Slug derived from timestamp or call context | No hardcoded slug | Read |
| ISC-10 | test | Output format identical with/without `--opencode` | Same stdout shape | Bash diff |
| ISC-11 | read | capabilities.md Advisor invoke line | Contains `--opencode` | Read |
| ISC-12 | read | capabilities.md new OpenCode entry | Entry present | Read |
| ISC-13 | read | CLAUDE.md Operational Rules | `--opencode` rule present | Read |
| ISC-14 | read | CLAUDE.md rule text | Fallback mentioned | Read |
| ISC-15 | read | capabilities.md closed list | Advisor name unchanged | Read |
| ISC-16 | test | `bun Inference.ts --opencode --level fast "sys" "hi"` | Non-error exit | Bash |
| ISC-17 | test | `bun Inference.ts --opencode --mode advisor "t" "s" "q"` | Non-error exit | Bash |
| ISC-18 | test | `bun Inference.ts --level fast "sys" "hi"` | Same behavior as before | Bash |
| ISC-19 | code | Path construction in new code | Uses env vars / relative | Read |
| ISC-20 | code | `--timeout-ms` passed to InferenceOpencode.ts | Per-level budget wired | Read |
| ISC-21 | code | No `@anthropic-ai/sdk` import in opencode path | Absent | Read/Grep |
| ISC-22 | code | No `ANTHROPIC_API_KEY` set in opencode path | Absent | Read |
| ISC-23 | test | Existing hook callers | No breakage | Bash test |
| ISC-24 | test | `--opencode` flag actually routes to OpenCode | Verdict field in output | Bash |
| ISC-25 | test | `--opencode --json` flag | JSON parsed correctly | Bash |
| ISC-26 | read | capabilities.md closed list | No new names added | Read |
| ISC-27 | read | CLAUDE.md section | Rule in Operational Rules | Read |
| ISC-28 | read | capabilities.md entry | URL + auth documented | Read |
| ISC-29 | code | Slug generation | Timestamp-based unique | Read |
| ISC-30 | code | Timeout verdict handler | Error surfaced | Read |
| ISC-31 | code | Error verdict handler | Error surfaced | Read |
| ISC-32 | read | CLAUDE.md rule | E3+ threshold stated | Read |
| ISC-33 | code | Advisor prompt construction | task/state/question labeled | Read |
| ISC-34 | code | Default `--opencode` not set globally | Opt-in only | Read |
| ISC-35 | read | File modification list | Only Inference.ts modified | Read |
| ISC-36 | test | Live end-to-end fast call | Non-empty response | Bash |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| inference-opencode-flag | Add `--opencode` flag to Inference.ts; route fast/standard/smart/advisor through InferenceOpencode.ts; fallback to Claude on unavailable | ISC-1,ISC-2,ISC-3,ISC-4,ISC-5,ISC-6,ISC-7,ISC-8,ISC-9,ISC-10,ISC-19,ISC-20,ISC-21,ISC-22,ISC-24,ISC-25,ISC-29,ISC-30,ISC-31,ISC-33,ISC-34,ISC-35 | none | false |
| capabilities-update | Update capabilities.md Advisor invoke to `--opencode`; add OpenCode entry to table | ISC-11,ISC-12,ISC-15,ISC-26,ISC-28 | inference-opencode-flag | false |
| claude-md-rule | Add operational rule to CLAUDE.md Operational Rules section | ISC-13,ISC-14,ISC-27,ISC-32 | capabilities-update | false |
| verification | Live end-to-end tests confirming all paths work | ISC-16,ISC-17,ISC-18,ISC-23,ISC-36 | claude-md-rule | false |
