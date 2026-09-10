---
name: _REPOPULSE
description: Analyse Azure DevOps repos and track how work actually gets done — repo shape and purpose, commit and PR patterns over time, contributor concentration, and the common thread across an org's repos. Produces Obsidian-format markdown with mermaid diagrams into the work corpus, never the vault. USE WHEN repo analysis, analyse my repos, azure devops, ADO repos, what are my repos doing, repo pulse, work tracking, how is work being done, who is working on what, repo activity, commit patterns, contributor analysis, ways of working, delivery patterns, repo health, dormant repos, bus factor. NOT FOR reviewing code correctness in a diff (use code-review), capturing reference material (use Capture), or analysing GitHub repos (this is Azure DevOps only).
---

# RepoPulse

On-demand analysis of an Azure DevOps org: what the repos are, how work moves
through them, and what the pattern across all of them says about ways of working.

**Output is work-confidential.** It goes to `~/corpus/inform/Working_area/RepoAnalysis/`
and never to `~/obsidian/`. The vault boundary is source-vs-derived, but this
material names an employer's projects, people and clients — corpus is the right
side of the line. Written in Obsidian-flavoured markdown so the folder can be
opened as a vault if wanted.

## Workflow Routing

| Trigger | Workflow |
|---|---|
| "analyse the active repos", "what are these repos doing", deep-dive | `Workflows/DeepDive.md` |
| "overall analysis", "all the repos", "common thread", "ways of working" | `Workflows/CrossRepo.md` |
| "what changed since last time", "track the work" | `Workflows/Track.md` |
| "how is devops set up", "boards", "pipelines", "policies", "process" | `Workflows/Setup.md` |

## Tools

Deterministic, so analysis budget goes on judgement rather than plumbing.

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Pulse.ts scan          # every repo: activity, contributors, PRs
bun run ~/.claude/skills/_REPOPULSE/Tools/Pulse.ts repo "<name>" # one repo in depth
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts commits "<name>" 500
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts prs "<name>"
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts tree "<name>" [OneLevel|Full]
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts file "<name>" /README.md

bun run ~/.claude/skills/_REPOPULSE/Tools/Estate.ts probe   # which areas the PAT can read
bun run ~/.claude/skills/_REPOPULSE/Tools/Estate.ts setup   # projects, pipelines, policies, teams
```

A full org scan takes about five seconds. Always start there — it tells you
which repos deserve the expensive per-repo reads.

## What makes this analysis worth reading

The scan gives you counts. The analysis has to say what the counts *mean*, and
the interesting findings are nearly always about people and process rather than
code volume:

- **Ownership concentration.** `soleOwner` is set when one person has ≥90% of
  commits. That is a bus-factor finding, and it is different from a repo simply
  being quiet.
- **Review culture.** Compare `prCount` against `reviewedPRs`. A repo with many
  PRs and no reviewers is using PRs as a changelog, not a quality gate. A repo
  with no PRs at all is direct-to-main.
- **Dormancy versus completion.** A repo untouched for 200 days is not
  automatically neglected — it may have finished. Read the README and the last
  few commit messages before calling anything stale.
- **Agent adoption.** `agentFiles` flags `CLAUDE.md`, `.claude/`, `GEMINI.md`
  and friends. Where these exist, agent-assisted development is already
  established practice, which changes what any recommendation should assume.
- **Repo shape.** The top-level tree usually says what a repo is for faster than
  its name does: `Solutions/` plus a pipeline YAML is a delivery repo;
  `research/` plus `dev-docs/` is a knowledge repo.

Write the analysis so someone who has never opened these repos can follow it.
Name the specific repo and the specific number behind every claim.

## Diagrams

Mermaid, in fenced ```mermaid blocks. Obsidian renders these natively — do not
generate images. Prefer these shapes:

- **Activity timeline** — `gantt` for live/dormant across the estate.
- **Contribution map** — `flowchart LR` from people to the repos they own.
- **Work flow** — `flowchart TD` for how a change travels in a given repo
  (branch → PR → review → main → pipeline), derived from actual PR data.
- **Estate overview** — `mindmap` grouping repos by what they are for.

Keep each diagram to one idea. A diagram that needs a paragraph to decode has
failed; split it.

## Gotchas

- **`searchCriteria.$top`, not `$top`, on the commits endpoint.** A plain
  `$top` is silently ignored and you get the default page back, which makes a
  busy repo look quiet. `Ado.ts` handles this; don't hand-roll the URL.
- **The same person commits under several spellings.** `thomas-capaldi` and
  `Thomas Capaldi` are one human. Unfolded, contributor counts double and each
  share halves. `Pulse.ts` folds via `canonical()` — never count raw author
  strings.
- **A 401 on Code endpoints with a 200 on `_apis/projects` means scope, not a
  bad token.** The PAT needs Code (Read). Probe `_apis/projects` first to prove
  auth works, then the resource you actually want.
- **Commit sampling is capped at 500.** For a repo at the cap, `commitCount` is
  a floor, not a total — say so rather than reporting it as exact.
- **`last30`/`last90` are computed from the sampled window.** On a very busy
  repo the window may not reach back 90 days, so `last90` can understate.
- **An empty repo has no `defaultBranch`.** Every commit/tree call against it
  fails; `Pulse.ts` short-circuits on `empty`.
- **ADO throttles burst parallel reads.** `scan` is deliberately serial. Don't
  "optimise" it into `Promise.all` across repos.
- **A pipeline YAML in a repo is not a registered pipeline.** `Digital solutions
  team` carries authored Power Platform YAML with `trigger: none` while the org
  has zero build definitions. Check `Estate.ts setup` before claiming anything
  about automation — the file existing proves intent, not operation.
- **Absent branch policy explains absent review.** Before reading unreviewed PRs
  as sloppiness, check whether a minimum-reviewer policy exists at all. No gate
  configured makes it a working style, not a lapse.
- **`Estate.ts` returns null on 403 rather than throwing.** Denied areas print as
  DENIED with the scope needed. Always state which areas were unreadable in the
  written output — an analysis silently missing work items looks complete and
  is not.
- **Never write output into `~/obsidian/`.** Employer material. Corpus only.

## Output convention

`~/corpus/inform/Working_area/RepoAnalysis/YYYY-MM-DD-<slug>.md`

Date-stamped so successive runs accumulate rather than overwrite — that history
is what makes `Workflows/Track.md` able to show change over time. Each file
carries Obsidian frontmatter (`title`, `date`, `tags`, `type: analysis`) and
opens with a two-sentence summary of the single most important finding.
