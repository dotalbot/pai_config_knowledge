---
last_updated: 2026-08-22
last_updated_by: da
convention: pai-freshness-v1
last_reviewed: 2026-08-22
last_reviewed_by: migration-7.40.4
---

# Projects — Dom

> Seeded during the 2026-08-20 migration to LifeOS 7.40.4. The old install never populated a global PROJECTS file; this is a starter derived from active TELOS goals. Update as work progresses.

## Active

- **LifeOS migration → Claude Code primary** — migrated off OpenCode harness to Claude Code as primary; updated PAI 5.0.0/Algo v6.3.0 → LifeOS 7.40.4/Algo v8.20.2; archived and retired OpenCode. (In progress — see `LIFEOS/MEMORY/WORK/opencode-pai-migration/ISA.md`.)
- **G0 — Build a PowerApps canvas app** (from TELOS/GOALS).
- ~~G1 — Land a senior role~~ ✅ **achieved 2026-08** — in post 3 weeks. See TELOS/GOALS Completed.

## Open asks — things Dom owes JellyPai

Surface these when a natural opening appears. Do not nag every session.

- **DUE 2026-09-18 — reflection corpus 7-day verdict.** `ReflectionGate`
  (commit cfda99e) closed the learn step's open loop on 2026-09-11, after the
  corpus sat dead from 2026-06-12. Baseline: 8 entries, 1 schema-9. A cron
  probe runs 09:23 on the 18th and writes
  `MEMORY/STATE/reflection-corpus-check.md`. Zero new entries means the gate is
  not firing as designed and that IS the finding — do not paper over it with a
  fourth workaround. Related open record: runs still are not ISA-registered
  (21 of 22 sessions), which is the deliberate design question left unanswered.

- **BLOCKED until Tue 2026-09-01 — SharePoint access needs Inform app
  authorisation.** rclone v1.75.0 is installed at `~/.local/bin/rclone` and
  `~/.config/rclone` is created at chmod 700, so the machine side is done. The
  blocker is tenant consent: rclone's default OneDrive client ID needs
  third-party app approval Dom does not hold. He is asking IT on Tuesday
  (Monday 2026-08-31 is a UK public holiday). On approval the remaining step is
  `rclone authorize "onedrive"` on the Mac, paste the JSON token, then bind the
  remote to the site URL and verify with a folder listing. If consent is
  refused, fall back to Graph API with an IT-approved app registration
  (`Sites.Read.All`). Reminder: Inform source docs go to
  `~/conveyor/quarantine/`, never `~/obsidian`. (Parked 2026-08-29.)

- **Fix GenerateTelosSummary completed-goal labelling.** It reports the
  completed goal as "G5" — a label that exists in no source file. Cause: the
  regex `\*\*(\w+)\*\*` at GenerateTelosSummary.ts:717 cannot match a bold
  span containing spaces or an em dash, so it falls through to something that
  synthesises an ID. Cosmetic, but PRINCIPAL_TELOS.md is @-imported every
  session, so it misreports which goal completed. (Found 2026-08-24 during
  /interview; deliberately not fixed mid-interview.)
- **Feed-in on P1 — AI evaluation capability.** Dom is actively working this
  space in the new role and TELOS has only the June one-liner. Needs a proper
  session: what "defining this" means, who it is for, what exists so far.
  (Raised 2026-08-24 during /interview.)
- **Feed-in on P2 — influencing the new organisation.** The problem has reframed
  from "architects are rubber stamps" to "how do I influence from inside".
  Different problem, different moves, and nothing about the new org is in TELOS.
  (Raised 2026-08-24 during /interview.)

- **Verdict on the Logk memory architecture.** `Projects/Logk/docs/architecture/
  LOGK_MEMORY_ARCHITECTURE.md` is an 18KB AI-generated three-layer proposal
  (Hindsight / Cognee / Logk + Golden Spine) that Dom has not ruled on. Until he
  does it is a proposal, not a decision. Full brief:
  `00 INBOX/TODO — Give verdict on Logk memory architecture.md`
- **Locate the logk repo, then land LOGK_MEMORY_ARCHITECTURE.md in it.** No logk
  repo exists on this machine (only jelly-life-os, pai_config_knowledge,
  Agent_register, home-network). `Projects/Logk/` in the vault mirrors a repo that
  is elsewhere or not yet created. Brief:
  `00 INBOX/TODO — Get LOGK_MEMORY_ARCHITECTURE into the logk repo.md`
- **Do the thinking on steelmanning.** Two source docs are staged
  ([[Steel Man Argument — Philosophy Vibe]], [[Steelmanning — concepts beyond the
  video]]); `01 Thinking/` deliberately left empty. Unusual case: steelmanning is
  already one of Dom's three argument moves in RHETORICALSTYLE.md, so this is
  examining a practice he already claims. Brief:
  `00 INBOX/TODO — Do the thinking on steelmanning.md`
- **Writing samples** (3-5, his own prose) so `WRITINGSTYLE.md` can be filled from
  evidence instead of introspection. Brief: `00 INBOX/TODO — Give JellyPai writing samples.md`
- **Rotate the `jellydbuser` PostgreSQL password** — it sat in plaintext in the
  vault from Feb until 2026-08-21.

## Repos

- `~/repo/jelly-life-os` — git@github.com:dotalbot/jelly-life-os.git
- `~/repo/pai_config_knowledge` — git@github.com:dotalbot/pai_config_knowledge.git
- `~/repo/Agent_register` — git@github.com:dotalbot/Agent_register.git
- `~/repo/home-network` — git@github.com:dotalbot/home-network.git

## Open Sessions to Resume

_(none)_
