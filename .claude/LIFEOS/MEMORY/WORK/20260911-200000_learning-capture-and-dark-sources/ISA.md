---
task: "Fix silent capture-quality failures and the Upgrade skill's dark sources"
slug: 20260911-200000_learning-capture-and-dark-sources
project: LifeOS
effort: advanced
effort_source: explicit
phase: complete
progress: 17/17
mode: interactive
started: 2026-09-11T19:00:00Z
updated: 2026-09-12T18:05:26+01:00
current_state: "Capture surfaces matched keywords, not intent; two of five Upgrade sources were silently dark"
ideal_state: "Every capture surface tests intent; every source reports live, absent or blocked — never silent"
---

## Problem

Three failures of the same class, all silent, all looking like success.

`SessionHarvester` matched `/actually,?\s+/i` against every transcript entry with
`type === 'user'` — a type that also carries skill invocations, pasted files, hook
context and inter-agent envelopes. Measured: 136 captures, 113 fired on the bare
word "actually", 22 files held whole skill bodies stored as learning.

`SatisfactionCapture` repeated the pattern on standing directives: any prompt
containing "in the future" became permanent doctrine. Of 16 stored, 7 were
questions or one-off tasks.

The Upgrade skill reported healthy coverage while two of five sources were dark.
The YouTube config had been orphaned in `LIFEOS/RETIRED/PAIUpgrade/` during the
PAI→LifeOS migration; `gh` was not installed. Both failed as empty output.

Underneath all three: the reflection corpus had been dead since 2026-06-12, so
the system had no internal signal about its own repeated mistakes.

## Vision

The system stops mistaking volume for signal. A learning file exists because
something was learned, a standing rule exists because a rule was stated, and a
source that did not run says so out loud. Euphoric surprise: opening
`MEMORY/LEARNING` and finding nine real corrections instead of 136 files of
transcript debris.

## Out of Scope

- No rewrite of the capture architecture. Gates at existing seams only.
- No deletion of historic junk. Quarantine is reversible; deletion is the
  principal's call.
- No fix for ISA registration itself. `ReflectionGate` deliberately sidesteps it
  rather than adding a third workaround; the underlying gap stays an open record.
- No auto-authored reflections. The self-critique is the model's to write.

## Constraints

- Gates fail OPEN. A gate that blocks on its own confusion is worse than the junk
  it stops.
- Enforce at the shared seam, not per-writer. Three writers share the learning
  path today and the next will not know the rule.
- `settings.json` is generated — edit `settings.system.json` and regenerate.
- Every tuning decision is validated against the REAL corpus, never invented cases.

## Goal

Every capture surface admits content on intent rather than keyword match, every
Upgrade source reports live/absent/blocked before the fan-out, and the reflection
loop writes to a live corpus — each proven by replay against real stored data.

## Criteria

- [x] ISC-1: `rejectLearning` rejects pasted artifacts, over-length text and substance-free prose (probe: replay over `MEMORY/LEARNING` keeps 9 of 136).
- [x] ISC-2: All 9 survivors are genuine typed corrections or stated insights (probe: read each body).
- [x] ISC-3: `LearningQualityGate` blocks junk writes to `MEMORY/LEARNING` via PreToolGuard (probe: 7/7 cases, exit 2 on junk).
- [x] ISC-4: The gate fails open on malformed input and non-LEARNING paths (probe: cases 5-7 exit 0).
- [x] ISC-5: `SessionHarvester` gates corrections at source (probe: post-fix run wrote zero junk).
- [x] ISC-6: `isNonDirectiveIntent` rejects questions, statements of fact, machine envelopes and one-off requests (probe: 10/10 both-directions suite).
- [x] ISC-7: Replay over the 16 real stored directives drops 7 and retains 9 (probe: `detectStandingDirective` replay).
- [x] ISC-8: The 7 false directives are rejected with a reason, not deleted (probe: store shows 7 rejected).
- [x] ISC-9: All 5 YouTube channels fetch live (probe: each returns a real title).
- [x] ISC-10: GitHub trending returns results with no 422 (probe: 3 queries, 22 matches on the first).
- [x] ISC-11: Source preflight reports every source live/absent/blocked (probe: run shows 4 green, gh-auth blocked).
- [x] ISC-12: Seen-state is banked and dedups (probe: re-running trending adds 0).
- [x] ISC-13: `ReflectionGate` fires once per session on a completion claim that did real work (probe: 8/8 cases).
- [x] ISC-14: The corpus holds a schema-9 entry (probe: 8 entries, 1 with the `reflection` field).
- [x] Anti: No gate blocks a legitimate write (probe: normal writes, genuine learning and clean turns all exit 0).
- [x] Anti: No existing gate regressed (probe: plutil, SystemFileGuard, FormatGate unchanged).
- [x] Anti: Nothing was deleted irreversibly (probe: 128 quarantined with MANIFEST.json; 7 directives rejected not dropped).

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1,2 | replay | run gate over real corpus | 9 kept, all genuine | bun |
| ISC-3,4 | unit | hook exit codes | 7/7 | bun + PreToolGuard |
| ISC-6,7 | replay | real stored directives | 10/10 suite, 7 dropped | bun |
| ISC-9,10 | live | fetch each source | all return data | yt-dlp, gh |
| ISC-12 | idempotence | re-run and diff | 0 added | python |
| ISC-13,14 | unit + state | gate cases, corpus read | 8/8, schema-9 present | bun |
| Anti-* | regression | replay unrelated gates | unchanged | bun |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| admission-test | `rejectLearning` + artifact markers in shared lib | ISC-1, ISC-2 | — | false |
| learning-gate | PreToolUse gate at the filesystem boundary | ISC-3, ISC-4 | admission-test | false |
| harvester-fix | gate corrections at source | ISC-5 | admission-test | true |
| quarantine | move 128 junk files with a manifest | Anti-3 | admission-test | true |
| directive-intent | intent gate before phrase match | ISC-6, ISC-7, ISC-8 | — | true |
| source-restore | YouTube config, gh auth, trending queries | ISC-9, ISC-10 | — | true |
| preflight | honest source status before fan-out | ISC-11 | source-restore | false |
| seen-state | bank and dedup both state files | ISC-12 | source-restore | false |
| reflection-gate | Stop gate closing the learn step | ISC-13, ISC-14 | — | true |

## Decisions

- 2026-09-11 — Gate at the filesystem boundary, not in each writer. Three writers share the path and the next will not know the rule.
- 2026-09-11 — `ReflectionGate` nudges, never auto-writes. A fabricated self-critique would refill the corpus with exactly the noise the learning gate was built to keep out.
- 2026-09-11 — First tuning kept 1 of 136, which discarded genuine typed questions. Relaxed the substance bar below 400 chars; kept 9. Tuned against real data, not invented cases.
- 2026-09-11 — Stopped tightening the directive gate at 7/16. Over-fitting to 16 samples would start dropping real rules, the costlier error.
- 2026-09-11 — `--help` discovery landed in `Prompting/Standards.md`, not the system prompt: the tool-contracts keep-class is constitutional and stays the default.
- 2026-09-11 — Did not pin `claude-fable-5-1`. No API key to probe `/v1/models`; pinning an unverified string is guessing.
- 2026-09-11 — Deliberately did NOT fix ISA registration. `ReflectionGate` sidesteps it; a third workaround would hide the gap rather than close it.

## Changelog

- conjectured: the dead reflection corpus was behavioural — the DA simply was not running the Algorithm loop (2026-09-02 record, which set a one-week re-check).
  refuted by: 9 days later, 21 of 22 work.json sessions still had no ISA and the corpus had not moved.
  learned: the loop had no closer at all — `Reflect.ts` has no automated caller, and the nudge that would prompt it is ISA-gated, so no run ever qualified.
  criterion now: ISC-13 requires a mechanism that fires independently of ISA registration.

- conjectured: `DriftReminder` had no phrase-level check, only structural checks.
  refuted by: reading the hook — it imports `firstBannedHit` over a 106-entry vocabulary list.
  learned: the mechanism existed; the model-specific tics were what was missing.
  criterion now: the fix is four entries added to an existing list, not a new check.

## Verification

- ISC-1,2: replay kept 9 of 136; all nine read and confirmed genuine (`majority is actually maturity, please fix across`).
- ISC-3,4: 7/7 hook cases — junk exit 2, malformed/unrelated/legit exit 0.
- ISC-6,7: 10/10 suite; replay over 16 real directives dropped 7, retained 9.
- ISC-9: all 5 channels returned titles; `@AnthropicAI` was dead, corrected to `@anthropic-ai`.
- ISC-10: 3 queries, 22 matches on the first, no 422.
- ISC-11: preflight run — 4 green, gh-auth correctly reported blocked before auth.
- ISC-12: re-running trending adds 0 entries.
- ISC-13,14: 8/8 cases including suppression; corpus 8 entries, 1 schema-9.
- Anti: plutil guard exit 2, SystemFileGuard and FormatGate unchanged, hooks/permissions byte-identical after MergeSettings; 128 files quarantined with a manifest, 7 directives rejected with reasons.
- Commits: b4ef3ed, 344da6b, cfda99e, 6c36adc, d192a1a, adf90e2, 4f832eb, d0529cc, 3d680d1.
