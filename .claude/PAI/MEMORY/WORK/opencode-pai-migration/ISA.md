---
task: Analyze old opencode PAI setup, plan replacement with current LifeOS
slug: opencode-pai-migration
effort: E4
phase: plan
progress: 0/12
mode: analyze-then-plan
started: 2026-08-20
updated: 2026-08-20
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
  - [x] Phase 2c: Data migration DONE (ran BEFORE 2b to avoid empty-identity window — user away, chose recommended sequencing). Wrote deterministic migrate-user.ts: 16 mapped to LIFEOS/USER schema (PRINCIPAL/, DIGITAL_ASSISTANT/, TELOS/, BUSINESS/, etc.), 18 parked verbatim under _migrated-from-pai/. AppleDouble junk skipped. MEMORY rsync'd across (15 KNOWLEDGE, 71 LEARNING, 25 WORK, 16M). Source PAI/USER + PAI/MEMORY untouched. Verified real identity content (not templates).
  - [x] Phase 2b: System overlay DONE. Backed up settings.json + CLAUDE.md (.pre-2b-*.bak). InstallSettings --apply (merge, +9 keys, +6 env incl LIFEOS_DIR). InstallHooks --apply (+62, kept 12). CRITICAL FIX: replaced ALL 120 `$HOME` → `/home/jellypai` in settings.json (the harness injects env verbatim so unbraced $HOME made junk dirs) — 0 remain, JSON valid. Placed new CLAUDE.md (LIFEOS routing, 0 placeholders, 0 stale @PAI). Created 2 missing identity files: CONFIG/OPERATIONAL_RULES.md (ported from old CLAUDE.md rules) + PROJECTS.md (seeded from TELOS). ActivateImports --apply → 5 imports active, all resolve. Wired `lifeos` launch alias in .bashrc (old `pai` alias commented by installer). VERIFIED: Algorithm v8.20.2, VERSION 7.40.4, 78 hook files, SecurityPipeline hook fires exit 0. Old MODES templates relocated to system prompt (v8 abolished mode/tier router — not lost).
- [x] Phase 2b-fix: Stop-hook failures (TabState, StopGates, then ResponseTabReset/DocIntegrity) root-caused to MIXED-VERSION hooks — DeployCore copyMissing added v8 hook .ts files but left stale old-PAI hooks/lib/ + hooks/handlers/. New hooks imported symbols (setAscentTab, findActiveSessionByUUID, setPhaseTab via handlers) only in new versions. FIX: force-synced (via /bin/cp, bypassing cp -i alias) all 29 lib/ + 55 hook + 9 handler files from payload → backed up hooks/lib.pre-libsync-*. Result: all 11 registered Stop hooks pass, all registered hook files exist. NOTE: no Doctor.ts ships in 7.40.4 payload — the /LifeOS doctor route is unavailable this version; diagnosed hooks directly instead. Installed still has 78 hooks/10 handlers vs payload 55/9 → ~23 old-PAI orphans remain on disk (harmless unless registered; only registered ones tested).

- [x] Phase 3: OpenCode fully retired DONE. Archived .config/opencode + .local/share/opencode → ~/opencode-archive-20260820-122114.tar.gz (12M, verified). Killed :7878 server. Removed binary symlink + global opencode-ai package + config + data. VERIFIED: not on PATH, :7878 free, no systemd unit, no rc refs, no hard :7878 dep in LIFEOS/TOOLS. Rollback archive intact.
- [x] Health tool saved: ~/.claude/LIFEOS/TOOLS/HookHealth.ts (fires every settings.json-registered hook w/ synthetic event per event-type; reports pass/fail/missing). Fixed a bug: settings.json is in HARNESS root (~/.claude) not LIFEOS_CONFIG_DIR (/home/jellypai/.config/LIFEOS — note config dir ≠ harness dir, a live discrepancy).

- [~] Phase 3.5: FULL SYSTEM HEALTH CHECK (in progress). HookHealth run: 102 pass / 11 fail / 0 missing. Failure classes:
  1. BENIGN (working as designed): SecurityPipeline exit2="patterns file missing—fail-closed"; TaskGovernance exit2="description too short" (rejected my empty synthetic input correctly).
  2. REAL — old-PAI ORPHANS registered in settings.json but superseded/absent in v8 payload: RelationshipMemory, KVSync, RestoreContext, ToolActivityTracker (import dead getPaiDir/getObservabilityConfig). ALSO: entire hooks/security/ inspector suite + SecurityPipeline.hook.ts are NOT in v8 payload — v8 uses a different security model (ContainmentGuard + DataClassification.md/SecurityModel.md). Old SecurityPipeline registered but superseded → fails closed on missing PATTERNS.yaml (paiPath → legacy PAI/ tree).
  3. Config discrepancy: LIFEOS_CONFIG_DIR=/home/jellypai/.config/LIFEOS but real tree is ~/.claude — env var points nowhere.
  Two Explore agents dispatched (subsystem inventory + obsidian/PAI archaeology). OBSIDIAN: old PAI wired vault at /opt/docker/appdata/.../OB_v2 (ObsidianSessionNote handler, hardcoded); NO obsidian CLI installed yet; user will provide vault + wants CLI-controlled sync.
  FIXED inline: LIFEOS_CONFIG_DIR /.config/LIFEOS → /home/jellypai/.claude (was pointing nowhere).
  AUDIT COMPLETE (2 Explore agents). Findings:
  - 23 orphan hooks not in v8 payload; ~10 still wired in settings.json. 3 actively read frozen legacy tree: RepeatDetection (PAI/MEMORY/STATE), ContainmentGuard (PAI zones), TelosSummarySync (PAI/USER/TELOS). SecurityPipeline+hooks/security/ suite superseded by v8 ContainmentGuard+DataClassification model.
  - settings.json REGEN BROKEN: SessionStart runs MergeSettings from settings.system.json + LIFEOS/USER/CONFIG/settings.user.json — BOTH MISSING → stale PAI_DIR/statusline/creds paths stay live. statusLine still → PAI/statusline-command.sh.
  - Stale in settings.json: PAI_DIR (L4), GOOGLE creds path (L9), statusLine (L896). CLAUDE.md clean.
  - Version divergence Algo 8.20.2 vs LifeOS 7.40.4 = BY DESIGN (Ledger: Algorithm is independent component line).
  - OBSIDIAN: vault LIVE at /opt/docker/appdata/obsidian-jellybase/vault/OB_v2 (modified today). Capture server RUNNING pid 1011 :27337. 5 session notes written today into 07 PAI/. NO CLI — all integrations are direct FS writes. VAULT const hardcoded in 6 places. InboxRouter (hourly cron) routes 00 INBOX. Excalidraw skill writes vault.
  - PRIOR WORK to preserve: 24 WORK ISAs (obsidian-capture, inform-team-due-diligence, excalidraw, pai-upgrades), 24 KNOWLEDGE files (inform-limited due-diligence, daniel-miessler, caminao), TELOS (real personalized). All still in PAI/MEMORY (migrated to LIFEOS/MEMORY in 2c) + parked.
  - Pulse deps thin (7 node_modules) — bun install advised. Old PAI_SYSTEM_PROMPT.md still on disk (harmless, launcher uses LIFEOS one).

- [x] Phase 3.6: CLEANUP (user: fix all now + migrate obsidian to config). DONE:
  - Fixed stale settings paths: statusLine → LIFEOS_StatusLine.sh, GOOGLE creds → LIFEOS/USER.
  - De-registered 5 broken/superseded hook regs: 4 dead-import orphans (RelationshipMemory/KVSync/RestoreContext/ToolActivityTracker — v8 has PostToolObserver/AgentInvocation or dropped by design) + SecurityPipeline (superseded by v8 guard suite: ContainmentGuard/PreToolGuard/KnowledgeWriteGuard active). Kept 18 working old-PAI hooks (vault notes, TELOS sync, UI tabs — all PASS, no v8 equiv, removing would lose function).
  - FIXED SELF-HEAL: settings.json is a GENERATED artifact (SessionStart runs MergeSettings from settings.system.json + LIFEOS/USER/CONFIG/settings.user.json — both were MISSING so all my edits would've been wiped next session). Created settings.system.json (snapshot of cleaned settings) + settings.user.json ({}). Merge round-trips clean + auto-pruned 6 invalid permission rules (inert Write()/unknown MultiEdit()).
  - HookHealth.ts improved: treats exit-2 deny/block as pass-with-block, valid TaskCreated payload. Result: 103 pass / 0 fail.
  - OBSIDIAN → config: created LIFEOS/USER/INTEGRATIONS/obsidian.yaml (single source of truth, sync.cli fields ready for CLI control). ObsidianSessionNote handler now reads it w/ fallback, compiles, fires ok. Vault LIVE, path unchanged for now (user sets CLI later).
  - Pulse deps: bun install clean.

- [x] Phase 4 DONE: swept ~40M path-bug $HOME dirs (~/, ~/.claude/, ~/repo/jelly-life-os/) + empty .config/PAI stub + 5 dead unregistered orphan hooks (→ hooks/.orphans-removed-* backup). KEPT .claude_backup (32M) + 18 working registered old-PAI hooks. Health 103/0. 105 registered hook entries intact.
- [x] Post-migration fixes: lifeos alias was only in .bashrc but shell is ZSH — added to .zshrc (launcher v2.2.0 confirmed working). Vault MOVED /opt/docker/.../OB_v2 → ~/obsidian; updated obsidian.yaml path. Vault is a git repo (no remote). New structure: 01 Thinking (zettel, 62), 02 Doing (AI context, empty), Projects (367), Toolkit (46), 05 Journal (47), 02 Cards (21). Documented in ~/obsidian/01 Thinking/Maps/Vault Guide.md (model: human brain→thinking, AI brain→doing). 'ob' sync CLI NOT found on PATH — need exact command from user for scheduling.

MIGRATION COMPLETE (Phases 0-4).
- [x] ob sync scheduled: found ob at ~/.local/npm/bin/ob (v0.0.14, official Obsidian headless client). Vault OB_V2 configured, logged in, bidirectional. Created ob-sync.sh wrapper (flock-guarded + logged to LIFEOS/MEMORY/STATE/ob-sync.log). Cron */3 * * * *. Tested: "Fully synced" ok.
- [x] Vault structure scanned + change-doc found (Vault Guide.md — human-brain/AI-brain split, 4-template QuickAdd flow, 19 plugins).
ALL DONE. phase: complete.
