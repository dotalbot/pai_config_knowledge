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

- **DUE 2026-09-19 — TELOS dimension review.** Rings were populated 2026-09-12
  (commit 2d106ba): health 21, money 50, freedom 10, creative 50,
  relationships 80. A cron probe runs 09:15 on the 19th, writes
  `MEMORY/STATE/dimensions-review.md` and speaks a notification. **Two calls
  left open that week, both mine not his:** (1) relationships derived 80 but
  Dom's own read was 70, so a `have` marker is written stronger than he'd
  score it — ask which; (2) FREEDOM's "afternoon nap = partial" was my
  inference, never his words, and it is the only reason freedom is 10 rather
  than 0. The question worth more than re-scoring everything: are the fifteen
  quiet minutes reachable yet? IDEAL_STATE names that the leading indicator
  for the whole dimension, and it has been "no" on 08-24 and again on 09-12.

- ~~LIFE DIMENSIONS rings read 0/100 because `LIFEOS_STATE.json` doesn't
  exist.~~ ✅ **FIXED 2026-09-12** (commit 2d106ba) — CURRENT_STATE files now
  drive the rings via derived have/partial/missing markers. Original note:
  seen in the browser (first real render of /telos).
  `buildDimensionsFromIdealState` reads `TELOS/LIFEOS_STATE.json` for each
  dimension's `pct`; the file is absent, so all five default to 0 and the page
  says "0% of your ideal state" with health and finances both "100% below
  ideal". Not a bug — unpopulated config. The five IDEAL_STATE files
  (HEALTH/MONEY/FREEDOM/RELATIONSHIPS/CREATIVE) are present, so only the
  scoring is missing. Needs Dom's own numbers: where he sits today on each,
  0-100. Note `creative_freedom` is a composite averaging creative + freedom.
  Ask when there's an opening; don't invent percentages for someone's life.

- ~~Pulse `/api/life/goals` parses headings, but TELOS files use bullets.~~
  ✅ **FIXED 2026-09-12**, browser-verified on the Mac. Three commits:
  66f9855 (bullet parsing across all 13 sections; sparks 0 → 8), adc4dae
  (orphan `**` on goal text — the browser caught this one after the API
  looked clean), a67bdb4 (SPARK panel: /api/life/home had a fourth copy of
  the `### ` filter). /life now shows 3 missions, 3 problems, 2 goals as
  prose. Lesson worth keeping: four separate parsers held the same wrong
  assumption, and only the rendered page exposed the last two.

- **Bunker is unconfigured on this host.** `/api/bunker/critical` returns
  `configured:false` and every Pulse start logs `Module not found
  .../PULSE/Bunker/bin/bunker.ts` (present before the 2026-09-12 restart, so
  not a regression). The reference implementation is private and not shipped —
  so this is expected unless you want the panel gone. Either wire it up or
  silence the startup error.

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
