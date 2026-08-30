# Operational Rules — Dom

> Ported from the pre-LifeOS CLAUDE.md Operational Rules during the 2026-08-20 migration to LifeOS 7.40.4. Paths updated PAI→LIFEOS; OpenCode inference retired.

## Rules

- bun/bunx always. Never npm/npx. Zero exceptions.
- TypeScript always. Never Python unless Dom explicitly approves.
- Never hardcode paths. Use `${LIFEOS_DIR}`, `${HOME}`, relative paths. **Never a literal `$HOME/…` inside a settings.json or hook command** — the harness injects env values verbatim, so an unbraced `$HOME` creates a real `$HOME/` junk directory. Use the absolute path there.
- Never run `claude` subprocess inline. CLAUDECODE env blocks nested sessions. Verify edits by reading diffs.
- Never respond to duplicate task notifications. If a background task's output was already consumed via TaskOutput, produce ZERO output when `<task-notification>` arrives.
- Markdown zealot. Never HTML for content markdown supports. HTML only for `<details>`, `<aside>`, `<callout>`. Never XML tags in prompts — use markdown headers.
- Plan means stop. "Create a plan" = present and STOP. No execution without approval.
- Build over ask for reversible actions. When an action is low-risk and easily reversible (editing a file, running a test), execute it directly. Reserve AskUserQuestion for irreversible or high-impact decisions. Momentum matters.
- **Claude is the primary inference path (OpenCode retired 2026-08-20).** Call `Inference.ts` WITHOUT `--opencode` at every tier — model tiers resolve to Claude (fast=haiku, standard=sonnet, smart=claude-fable-5). The former OpenCode/GPT-5.5 backend on `localhost:7878` has been archived and shut down.
- Reproduce before fixing. Reported UI bug = open the page with the **Interceptor skill** FIRST. Console errors and network 404s before code analysis. Never theorize from code when you can just look.
- Interceptor for ALL web verification. Every time you create, fix, deploy, or claim anything works on the web — verify with Interceptor. Never use agent-browser for verification.

## Notes

- Effort shortcuts: `/e1` (Standard+fast-path), `/e2` (Extended), `/e3` (Advanced), `/e4` (Deep), `/e5` (Comprehensive). Append to any message to override auto-detection.
- Units: Metric (Celsius, meters, kilograms).
- Tools: `rg` over `grep`, `fd` over `find`.

## Vault and source capture

- **Obsidian vault lives at `~/obsidian`.** Canonical as of 2026-08-23. The old
  `/opt/docker/appdata/obsidian-jellybase/vault/OB_v2` path is SUPERSEDED — that
  directory still exists on disk with stale content, so finding it is not
  evidence it is current. Never quote a vault path from session history or a
  tool log; check `~/obsidian` exists and read from there.
- **`04 VAULT` no longer exists.** YouTube and article write-ups go to
  `~/obsidian/Sources/` per `~/obsidian/Sources/README.md`: Sources holds the
  processed write-up of someone else's material, `01 Thinking` holds Dom's own
  words. A clipper template still naming `04 VAULT/YouTube` is out of date.
- **YouTube extraction is two stages, capture then process.**
  - *Capture* — the Obsidian Web Clipper "YouTube (Open Transcript)_2" template.
    Fixed skeleton (Summary, Key Takeaways, Mindmap, Notable Quotes, Best Ideas,
    Tools, Reflection, Key Message), full transcript in a callout, frontmatter
    from page schema. This is raw input. Lands in `00 INBOX` or `Sources/YouTube`.
  - *Process* — rework into the Sources house style: `type: source`,
    `medium: youtube`, `status: processed`, `author`, `url`, `duration`,
    `published`, `tags`, `thinking-notes: []`; a `⬆️::` breadcrumb to
    `[[Sources/README|Sources]]`; a scope callout stating what the source does
    and does not cover; headings derived from the argument rather than the fixed
    skeleton; transcript dropped; a trailing `## ⬇️ Thinking notes from this
    source` section linking atomic notes in `01 Thinking`.
    Reference exemplar: `~/obsidian/Sources/YouTube/Steel Man Argument — Philosophy Vibe.md`.
  - When Dom says "extract from youtube" without qualifying, produce the capture
    format. Process only on request, or when the material earns a write-up.

## Research fan-out roster

Verified 2026-08-23 by running all four legs on one brief. The Research skill's
"4 agents — Claude + Gemini + Grok + Perplexity" description overstates what
this install actually does: `PerplexityResearcher`, `GrokResearcher` and
`GeminiResearcher` declare only `WebSearch` and hold no provider key, so they
are Claude agents with different personas over the same search. Only
`CodexResearcher` shells out to another vendor.

- **Drop `PerplexityResearcher`.** Went idle four times across three direct
  asks, including one narrowed to a single question with an explicit
  "or just say you're blocked" option. Produced nothing either way. Do not
  include it in a fan-out.
- **`GeminiResearcher` is quota-dead via the CLI.** The free tier returns
  `RESOURCE_EXHAUSTED`, and `limit: 0` on the default model. Its internal
  web-search tool is what 429s, so it cannot ground a URL. Its retry loops
  write 30-35KB files containing only stack traces — file size looks like
  success and zero headings is the tell. Route Gemini through OpenRouter
  instead, or fund a Google project.
- **OpenRouter is the cross-vendor path.** `OPENROUTER_API_KEY` in `.env`.
  Gives the MODEL, not a search tool: never ask an OpenRouter leg for URLs or
  citations, and mark anything it names as an unverified lead. Use it for
  framing and disagreement, not evidence.
- **`deepseek/deepseek-v4-flash`** — added to the roster 2026-08-23. Very cheap
  (~$0.00000005/input token). It is a REASONING model: the message object
  carries both `content` and `reasoning`, and too low a `max_tokens` truncates
  before `content` is emitted (16 returned null; 200 worked).
- **A leg that goes silent is failed — close it, don't wait.** 2026-08-23 run:
  three of five legs died by going idle without reporting, across repeated asks
  that explicitly offered "or just name the blocker in one sentence". The two
  that succeeded both surfaced their own constraints unprompted (a quota wall,
  its own prompt bias, three corrections to the brief). Self-reported limits are
  the signal that a leg is working; silence never resolves into output.
- **Check spend to tell "did nothing" from "did it and lost it".** The DeepSeek
  leg went idle three times having consumed ~$0.07 of tokens — responses came
  back and were never reported. The OpenRouter key endpoint distinguishes the
  two failure modes when an agent won't say.
- **Brief the legs on distinct decompositions, not just distinct personas.**
  The most valuable artefact of the 2026-08-23 run came from the quota-blocked
  agent: eight self-contained sub-queries naming specific primary sources. The
  useful diversity in this pattern is in how the problem is carved up.

## Reference corpus — `~/corpus/` is read-only

Created 2026-08-29 at Dom's approval. A durable **mirror**, distinct from the
conveyor queue: files here have no terminal state, they are read repeatedly.

- `~/corpus/inform/` (chmod 700) — work material. **Inherits the quarantine
  contract below in full**: source never enters `~/obsidian/`, never reaches
  Daemon or a release artefact, derived-means-Dom's-words.
- `~/corpus/personal/` — his own reference material.
- `~/corpus/.manifest/` (chmod 700) — rsync provenance; paths leak estate structure.

**I READ from corpus and NEVER WRITE to it.** Dom's laptop is the authority
copy; a mirror I can edit is not a mirror. No typo fixes, no reorganising, no
renames. To change something, he changes it at source and re-runs rsync.
Revisit the write question when SharePoint access lands — updating at source is
a separate, deliberate decision.

The tree inside `inform/` mirrors the SharePoint structure on purpose, so the
eventual cutover is a path swap and not a migration.

**Not backed up** — no git, no Obsidian sync, by design. Never let corpus hold
the only copy of anything. Contract: `~/corpus/README.md`.

## Work-confidential material — the vault boundary

**The split is source vs derived, not confidential vs not** (Dom's ruling,
2026-08-24). The vault is encrypted, so the concern is not interception:

- **Source material stays out of the vault.** Employer and client documents
  arrive via `~/conveyor/quarantine/` (chmod 700) and stay there. The original
  is not copied into `~/obsidian/`.
- **Derived work generally CAN go to the vault** — Dom's own notes, analysis,
  structure and thinking built on top of it. That is his work product, and it
  is where he needs to iterate on it.
- The line is verbatim reproduction: do not lift the source document into the
  vault under the guise of a summary. Derived means Dom's words and framing,
  not the original rearranged.
- Never to Daemon, never into a release artefact, regardless of derivation.
- When genuinely unsure which side something falls, ask before writing.
- Created 2026-08-24 for the Inform AI-maturity framework; corrected the same
  day after Dom's ruling — my first version banned derived notes too, which
  would have made the material useless to work with.

## Obsidian templates — QuickAdd is where Dom creates from

- **QuickAdd is the template entry point, not the core Templates plugin.** Any
  new or renamed vault template needs a matching QuickAdd choice, or Dom cannot
  reach it from the page icon — the template file existing is not enough.
- **Ask about QuickAdd whenever templates change.** Adding a template, renaming
  one, or moving the templates folder all break QuickAdd choices silently.
  Raise it rather than waiting for him to find the picker empty.
- Config lives at `.obsidian/plugins/quickadd/data.json`, and choices carry an
  absolute-from-vault-root `templatePath`. A moved folder orphans every choice.
- **The Mac holds the authoritative `.obsidian/`.** `~/obsidian/.obsidian` on
  this host is empty; whether app config syncs is a separate Obsidian Sync
  toggle from note syncing. Propose the change, let Dom apply it, or confirm
  the sync path first.
- Recorded 2026-08-25 at Dom's request, after new templates were invisible to
  the picker.

## Obsidian Sync — this host pushes notes, never config

Settled 2026-08-25. Baseline: bidirectional, merge, device `jellybase (Linux)`,
file types image/audio/pdf/video, **Configs: none**.

- **Never write into `~/obsidian/.obsidian/` from this host.** The Mac holds the
  authoritative app config — three months of plugin settings, hotkeys and
  appearance. This host's copy is empty. Writing here risks an empty config
  overwriting a populated one if config syncing is later enabled.
  (I did exactly this on 2026-08-25 — wrote `templates.json` into an empty
  `.obsidian/` and the sync log shows it was pushed upstream. Deleted.)
- **Do not set `--mode pull-only` to protect config.** It is vault-wide —
  "only download, ignore local changes" — so it silently stops this host
  pushing NOTES too. Everything LifeOS writes to the vault would stop reaching
  the Mac, without erroring.
- **Dom enables config syncing from the Mac**, so the populated side sets the
  baseline. Until then, config changes are his to make in the app.
- Checking the setting: `ob sync-status --path /home/jellypai/obsidian`.
  The sync log records `Configs: none (config syncing disabled)` per run.

## Inform DevOps — parked workstreams are legacy

Dom's ruling, 2026-08-25, after reviewing their contents:

- **Autobots** (231 open) · **Compliance and cyber** (91) · **Copilot adoption**
  (72) · **Copilot agents** (66) · **Agent Log Lords** (9) are **LEGACY**. Not
  work needed at the moment. Roughly 470 items, ~30% of the open backlog.
- **They come back only if Erica brings them forward.** Do not propose restarting
  them, do not surface them as a decision queue, and do not treat their age as a
  problem to fix — being still is correct for legacy work.
- **Show them collapsed and labelled legacy** in the cockpit, never mixed with
  live work. They must not inflate stale/unowned counts for active streams.
- I argued Compliance and cyber should be un-parked, on the basis that the MOD
  framework deadline at Christmas needs it. Dom ruled otherwise. If that
  deadline resurfaces, raise it as a question rather than re-litigating this.
