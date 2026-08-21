---
task: Fix the 2 CRITICAL infrastructure bugs found by the pai-upgrade-check-2026-07-01 scan
slug: pai-upgrade-fix-2026-07-01
effort: E3
phase: complete
progress: 8/8
mode: algorithm
started: 2026-07-01T12:35:00Z
updated: 2026-07-01T12:50:00Z
algorithm_config:
  parent_isa: pai-upgrade-check-2026-07-01
---

## Problem
The prior PAIUpgrade scan found two CRITICAL bugs in PAI's own tooling: `GetTranscript.ts` depends on a `fabric` CLI binary that isn't installed (blocking all YouTube discovery), and `Inference.ts --mode advisor` silently swallows real errors behind a generic "Process exited with code 1" message (the actual root cause is that `claude-fable-5` is currently unavailable, and that message lands on stdout not stderr).

## Vision
Both tools work correctly again: YouTube transcript extraction succeeds via yt-dlp's own caption download (no new external dependency), and Advisor calls transparently retry on a fallback model when the smart-tier model reports itself unavailable, surfacing the real reason if all else fails.

## Out of Scope
- The other HIGH/MEDIUM/LOW findings from the prior scan (TELOS placeholder content, missing PROJECTS.md, stale settings.json counters) — not requested, separate follow-ups.
- Upgrading yt-dlp itself (flagged as >90 days old but functional) — not blocking.
- Deep Agent SDK / MCP integration work suggested by the CC-freshness agent — speculative, unverified claims, explicitly dropped from the prior report.

## Principles
- Prefer removing a dependency (fabric) over adding a fallback path for it.
- Fix the actual root cause (model-unavailable, stdout/stderr swallowing) not just the symptom.
- Verify each fix by reproducing the original failure, then reproducing success.

## Constraints
- `Inference.ts` is used by the Algorithm's Rule 2/2a advisor doctrine and by every `--opencode`-gated E3+ call — changes must not break the existing `--auto-state`, `--json`, `--opencode`, `--timeout` flag surface.
- No other file currently hardcodes `claude-fable-5` or calls `level: 'smart'` directly (confirmed via grep) — Inference.ts is the single point of control for this fix.

## Goal
`GetTranscript.ts` extracts captions via yt-dlp without requiring fabric, and `Inference.ts`'s `smart` level (and therefore `advisor()`) transparently retries on `claude-opus-4-8` when `claude-fable-5` reports itself unavailable, surfacing the real error when it isn't.

## Criteria
- [x] ISC-1: `GetTranscript.ts` no longer shells out to `fabric`
- [x] ISC-2: `GetTranscript.ts` uses yt-dlp `--write-auto-sub --skip-download` to fetch captions
- [x] ISC-3: `GetTranscript.ts` handles the "no subtitles available" case gracefully (exits cleanly, clear message) rather than crashing
- [x] ISC-4: `Inference.ts`'s error path surfaces stdout content when stderr is empty, instead of a generic "Process exited with code N"
- [x] ISC-5: `Inference.ts`'s `smart` level retries once against a fallback model when the primary model reports "currently unavailable"
- [x] ISC-6: Live repro confirms the Advisor call now succeeds (`bun Inference.ts --mode advisor ...` returns real content, not a swallowed error)
- [x] ISC-7: Live repro confirms `GetTranscript.ts` extracts a real transcript for at least one video with captions
- [x] ISC-8: Anti: no new external binary dependency introduced (fabric removed, not replaced with another CLI requirement)

## Test Strategy
| ISC | Type | Check | Threshold | Tool |
|-----|------|-------|-----------|------|
| 1-3 | inspection | Read GetTranscript.ts, confirm no `fabric` string remains, confirm yt-dlp invocation present | Grep confirms | Read/Grep |
| 4-5 | inspection | Read Inference.ts diff, confirm fallback model constant + retry branch | Grep confirms | Read/Grep |
| 6 | tool | Run `bun Inference.ts --mode advisor ...` | Returns real content, no generic error | Bash |
| 7 | tool | Run rewritten `GetTranscript.ts` against a captioned video | Transcript text returned | Bash |
| 8 | inspection | Grep for new `execSync`/`spawn` calls to non-yt-dlp binaries | None found | Grep |

## Features
| name | satisfies | depends_on | parallelizable |
|------|-----------|------------|-----------------|
| Inference.ts fallback + error surfacing | ISC-4,5,6 | — | no |
| GetTranscript.ts yt-dlp rewrite | ISC-1,2,3,7,8 | — | no (sequential after Inference fix, same session) |

## Decisions
- 2026-07-01: Scaffolded a new task ISA rather than reopening `pai-upgrade-check-2026-07-01`, which is phase:complete and explicitly out-of-scope for code changes. This fix work is a distinct follow-on task the user requested afterward.
- 2026-07-01: Root-caused the Advisor failure precisely: `claude-fable-5` is "currently unavailable" per the CLI's own stdout message; `inference()`'s error path only checked `stderr`, discarding stdout, hence the generic "Process exited with code 1". Confirmed via direct reproduction: `env -u CLAUDECODE claude --print --model claude-fable-5 ...` → stdout: "Claude Fable 5 is currently unavailable...", stderr: empty, exit 1.
- 2026-07-01: Chose `claude-opus-4-8` as the one-shot fallback model for the `smart` tier, mirroring the existing `fallbackModel` chain already declared in `settings.json` (`["claude-opus-4-8", "claude-sonnet-4-6"]`) rather than inventing a new fallback policy.
- 2026-07-01: Chose to repoint `GetTranscript.ts` at yt-dlp's own `--write-auto-sub --skip-download` rather than installing the `fabric` CLI — avoids adding a new binary dependency when yt-dlp is already present and working (confirmed via version check and live caption-download test, including a legitimate "no subtitles for this video" case handled without crashing).
- 2026-07-01: Advisor call (now working) on this exact fix task correctly flagged that the parent ISA didn't reflect this new scope — acted on that feedback by creating this separate ISA rather than dismissing the critique.

## Changelog
- conjectured: The Advisor tool's generic "Process exited with code 1" meant an unknown/unspecified underlying failure.
- refuted_by: Direct reproduction of the exact `claude` subprocess call showed a specific, human-readable "Claude Fable 5 is currently unavailable" message on stdout, with empty stderr.
- learned: `inference()`'s non-zero-exit branch only read `stderr`, silently discarding any stdout content — a message-routing bug, not a genuine "unknown error" — and this exact failure mode was reproducing live during both the audit run and this fix run before the patch landed.
- criterion_now: Non-zero exit handling in CLI-wrapping inference tools must check stdout before falling back to a generic exit-code message, since not all CLIs route user-facing errors to stderr.

## Verification
- ISC-1..3: Confirmed via Read of rewritten `GetTranscript.ts` — no `fabric` references remain; `yt-dlp --write-auto-sub --skip-download --sub-format vtt` used; graceful "no captions" handling added.
- ISC-4: Confirmed via Read of `Inference.ts` `runClaudeCli()` — non-zero-exit branch now uses `stderr.trim() || stdout.trim() || generic-fallback`.
- ISC-5: Confirmed via Read of `Inference.ts` `inference()` — detects `isModelUnavailable(result.output)` and retries once against `SMART_FALLBACK_MODEL`.
- ISC-6: Live repro — `bun Inference.ts --mode advisor "TASK..." "STATE..." "QUESTION: reply with CONFIRMED"` → printed `[Inference] claude-fable-5 unavailable — retrying with claude-opus-4-8` then `CONFIRMED`. Second repro via `--auto-state` also succeeded mechanically (fallback triggered, real substantive advisor response returned, not a swallowed error).
- ISC-7: Live repro — `bun GetTranscript.ts "https://www.youtube.com/watch?v=jNQXAC9IVRw"` → "✅ Transcript extracted: 217 characters" with real spoken-word plain text (elephant video captions), exit 0. Also confirmed graceful failure path: invalid video ID → "❌ Failed to extract transcript: video is private or unavailable", exit 1 (no crash).
- ISC-8: Confirmed via `grep -n "fabric" GetTranscript.ts` — only match is the explanatory code comment noting fabric's removal; all `execSync` calls target yt-dlp or plain shell utilities (`ls`, `command -v`).
