# DeepDive Workflow

Analyse the most active repos in depth: what each one is, how work moves through
it, and what its change history says about how the team works.

## Step 1: Scan

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Pulse.ts scan > /tmp/rp-scan.json
```

Pick the targets: anything touched in the last 30 days, plus anything the
principal names. Three to five repos is the right size — more and the analysis
turns into a list instead of an argument.

## Step 2: Establish what each repo IS

For each target, read the evidence before forming a view:

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts tree "<repo>" OneLevel
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts file "<repo>" /README.md
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts file "<repo>" /CLAUDE.md
```

The top-level tree is usually more honest than the name. A `Solutions/` folder
plus a pipeline YAML is a delivery repo whatever it is called; `research/` and
`dev-docs/` is a knowledge repo.

If the README is the untouched Azure template ("TODO: Give a short
introduction"), say so — an unwritten README on an active repo is itself a
finding about how the team documents.

## Step 3: Read how work actually flows

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts prs "<repo>"
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts commits "<repo>" 500
bun run ~/.claude/skills/_REPOPULSE/Tools/Ado.ts branches "<repo>"
```

What you are looking for:

- **Branch naming** — `feature/*`, `users/*`, initials, or nothing. Convention
  or its absence tells you whether there is an agreed process.
- **PR reviewers** — present or empty. Empty means PRs are a record, not a gate.
- **Direct-to-main commits** versus merge commits.
- **Commit message shape** — conventional commits, prose, or `wip`. Consistency
  suggests tooling or discipline; drift suggests neither.
- **Cadence** — bursts around dates, or steady. Bursts usually mean deadlines
  or sprint boundaries.

## Step 4: Track change over time

Bucket commits by week or month and look for what changed in HOW they work, not
just how much. A shift from direct commits to reviewed PRs, or the arrival of a
`CLAUDE.md`, or pipeline YAML appearing, are all inflection points worth naming
with their date.

## Step 5: Write it up

One file, `~/corpus/inform/Working_area/RepoAnalysis/YYYY-MM-DD-active-repos.md`.

Per repo: what it is, who works in it, how a change travels through it, and what
changed recently. Include a mermaid `flowchart TD` of the actual work flow per
repo, and one `gantt` or timeline across them all.

Lead the document with the single most important finding, not with methodology.
