---
task: Analyze old opencode PAI setup, plan replacement with current LifeOS
slug: opencode-pai-migration
effort: E4
phase: complete
progress: 0/12
mode: analyze-then-plan
started: 2026-08-20
updated: 2026-08-20T15:05:58+01:00
---

## Problem

Dominic ran his LifeOS work driven from OpenCode (as harness + GPT-5.5 inference backend on :7878). He wants **Claude Code (this `~/.claude` install) to become the PRIMARY harness**: migrate the good work here, update from the stale live version (PAI 5.0.0 / Algorithm v6.3.0) to the latest staged payload (**LifeOS 7.40.4 / Algorithm v8.20.2**, restructured PAI→LIFEOS), preserve all prior work, then archive OpenCode and stop its services. This run analyzes + plans; execution is approval-gated and partly irreversible.

**Key facts established:** OpenCode kept NO separate PAI content (empty repos/, all 155 sessions ran in ~/ or ~/.claude) — the work already lives in ~/.claude and ~/repo. OpenCode serve (pid 2351) runs detached from init, not systemd — clean to stop. Live vs latest is a 2-major-version jump, not a refresh.

## Vision

A single, clean, authoritative LifeOS install in `~/.claude`, with every stale OpenCode-era PAI artifact and every accidental junk directory identified, and a safe, ordered, reversible cleanup plan Dominic can approve step by step. No mystery folders, no path-bug directories still accumulating cache.

## Out of Scope

- Actually deleting anything this run (analysis + plan only; deletion is a separate approved step).
- Reinstalling/re-running the LifeOS interview (setup is already live; that's a later choice).
- Touching the working `~/.claude` live tree except the one live path-bug in settings.json (flagged, not yet fixed).
- Migrating OpenCode as an editor/harness itself — the binary and its DB/auth stay.

## Constraints

- Additive, reversible, permission-gated (LifeOS hard rule + CLAUDE.md "Build over ask for reversible; ask for irreversible").
- Never rm a populated dir or foreign file without explicit per-target approval.
- The live `~/.claude` config root keeps its canonical name (renaming breaks identity @-imports).

## Goal

Produce an accurate inventory distinguishing (a) the live LifeOS install, (b) genuinely stale OpenCode-era PAI remnants, (c) accidental junk from a path bug, and (d) the root-cause path bug still generating junk — and a safe ordered cleanup/replacement plan with sizes, reversibility, and root-cause fix, presented for approval.

## Criteria

- [x] ISC-1: Locate the current live LifeOS/PAI install and confirm it is the authoritative one — Read `~/.claude` + skill version.
- [x] ISC-2: Locate the OpenCode config + binary and determine if OpenCode itself is still in use.
- [x] ISC-3: Find all stale/duplicate PAI trees outside the live one (`.claude_backup`, `.config/PAI`, literal-`$HOME` dirs).
- [x] ISC-4: Quantify each candidate cleanup target by size and last-write time.
- [x] ISC-5: Determine whether any junk dir is still being actively written (mtime + settings grep).
- [x] ISC-6: Root-cause the literal-`$HOME` directories (settings.json `$HOME/...` unbraced path bug).
- [x] ISC-7: Confirm whether LifeOS `setup` has actually run (no `~/.claude/LIFEOS` config tree present).
- [ ] ISC-8: Present findings table (target | what it is | size | safe-to-remove | reversible).
- [ ] ISC-9: Present ordered cleanup plan with the root-cause fix sequenced first.
- [ ] ISC-10: Anti: Do NOT delete or move any file or directory this run.
- [ ] ISC-11: Anti: Do NOT modify the live `~/.claude` tree (including settings.json) without a separate approval.
- [ ] ISC-12: Antecedent: Plan is presented as a numbered, per-target-approvable list so Dominic can accept/decline each.

## Test Strategy

isc | type | check | tool
ISC-8 | inspection | findings table rendered with all 4 candidate targets | response text
ISC-9 | inspection | ordered plan with root-cause-first | response text
ISC-10 | anti | no rm/mv executed | Bash history
ISC-12 | antecedent | plan is per-target approvable | response text

## Features

name | satisfies | depends_on | parallelizable
Inventory scan | ISC-1..7 | - | done
Findings + plan | ISC-8,9,12 | Inventory scan | no

## Decisions

- 2026-08-20: Classified as E4 (cross-cutting system audit + migration decision). Analysis-and-plan run per "analyze" + "Plan means stop" doctrine — no destructive execution.
- 2026-08-20: The "old opencode PAI setup" the user remembers is NOT a live parallel PAI — OpenCode's own config (`~/.config/opencode/opencode.jsonc`) is a 2-line stub. The stale PAI remnants are filesystem leftovers: `.claude_backup` (32M, Jun 6 snapshot), `.config/PAI/PAI-Install` (empty), and two literal-`$HOME` junk trees from a path bug.
- 2026-08-20: show-your-math on delegation floor — single-author filesystem audit; delegating adds noise, so ContextSearch used as the delegation-adjacent capability instead of spawning agents.

## Verification

ISC-1: Read — `~/.claude` is live LifeOS; `skills/LifeOS/SKILL.md` v1.5.43; PAI 5.0.0 / Algorithm v6.3.0 active.
ISC-2: Bash — `opencode 1.16.2` binary at `~/.bun/bin/opencode`; DB last touched 2026-08-16 (still used as an editor); config is a bare stub.
ISC-3: Bash — found `.claude_backup`, `.config/PAI/PAI-Install` (empty), `~/$HOME/.claude/PAI`, `~/.claude/$HOME/.claude/PAI`.
ISC-4: Bash — .claude_backup 32M, .config/opencode 62M, ~/.claude/$HOME 39M, ~/$HOME 1.1M, .config/PAI 8K.
ISC-5: Bash — junk dirs last written 2026-07-01 / 2026-06-19; settings.json contains unbraced `$HOME/.claude/...` — active writer.
ISC-6: Bash — root cause = `$HOME/...` (single-$, unbraced) in settings.json env + hook commands; violates CLAUDE.md "never ${HOME}/" rule.
ISC-7: Bash — no `~/.claude/LIFEOS` config tree → LifeOS `setup` payload staged in skill but not yet run into config root.

## Decisions (migration)

- 2026-08-20: Goal reframed by user — make Claude Code PRIMARY, migrate off OpenCode, update to latest, archive+retire OpenCode. Approved decisions: (1) Upgrade via official LifeOS Update workflow; (2) approve-each-phase execution; (3) fully retire OpenCode (archive → stop → remove binary+config).
- 2026-08-20: Payload delta confirmed — live PAI 5.0.0/Algo v6.3.0 → staged LifeOS 7.40.4/Algo v8.20.2, tree restructured PAI/→LIFEOS/ with new ATLAS/HERMES/CORTEX/RULES subsystems. This is a 2-major-version migration.
- 2026-08-20: OpenCode serve pid 2351 is init-parented (not systemd) — clean kill, no respawn. OpenCode holds no unique PAI content (empty repos/, all sessions ran in ~/ or ~/.claude).

## Phase Plan

- [x] Phase 0: Safety tarball of ~/.claude → ~/lifeos-premigration-20260820-115331.tar.gz (26M, 10989 entries, verified). ROLLBACK: tar -xzf <archive> -C ~
- [x] Phase 1: Cut OpenCode inference dependency — DONE. Edited CLAUDE.md (2 lines) + capabilities.md (2 lines: advisor L16, backend L92) to make Claude primary, no active OpenCode-preference guidance remains (grep clean). PROOF: killed :7878, ran `Inference.ts --level fast` → returned exactly "MIGRATED" with server down; restored :7878 after. Note: `--json` path errors ("Failed to parse JSON response") — same fragile claude-subprocess wrap that hit the mode classifier; plain-text path works.
- [~] Phase 2: LifeOS 7.40.4 migration. SPLIT into 2a/2b/2c after discovering: existingInstall=false, no LIFEOS/VERSION marker, and NEW incompatible USER schema (nested PAI/USER → flat LIFEOS/USER). Update workflow can't run (no marker); using Setup tools + AI data migration. User decisions: deploy runtime then AI-migrate data preserving every fact; unmapped data → LIFEOS/USER/_migrated-from-pai/ verbatim.
  - [x] Phase 2a: DeployCore --apply DONE. 196 skills + 769 runtime files copied. LIFEOS/VERSION=7.40.4, Algorithm v8.20.2 live, new skills (BiasCheck/Cortex/Hardening/DetectAI/CMUX/HTML/Novelty/Teach/Trim/Vitals/etc) registered. 3 transient bun-install failures (next, @rolldown) all fixed on retry. PAI/ untouched.
  - [ ] Phase 2b: System overlay — new CLAUDE.md + LIFEOS_SYSTEM_PROMPT + settings + hooks + ActivateImports (Setup steps 4,7,8). Fixes $HOME bug via InstallSettings $HOME-expansion. [NEXT]
  - [ ] Phase 2c: AI data migration — reshape PAI/USER + TELOS into flat LIFEOS/USER schema, copy MEMORY across, park unmapped under _migrated-from-pai/. [AFTER 2b]
- [ ] Phase 3: Archive OpenCode (~/.config/opencode + ~/.local/share/opencode → tarball), kill 2351, remove binary+config. [AWAITING APPROVAL]
- [ ] Phase 4: Delete path-bug junk dirs + empty stub. Keep .claude_backup. [AWAITING APPROVAL]
