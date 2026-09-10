# Track Workflow

What changed since the last run. Requires at least one prior analysis file.

## Step 1: Find the baseline

```bash
ls -1 ~/corpus/inform/Working_area/RepoAnalysis/*.md | tail -5
```

Read the most recent cross-repo analysis for its recorded figures.

## Step 2: Re-scan and diff

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Pulse.ts scan > /tmp/rp-now.json
```

Compare against the baseline and report only what MOVED:

- Repos that woke up or went quiet
- New repos, and repos that gained a first PR or first reviewer
- Contributor changes — someone new, someone stopped, ownership shifting
- Structural change — a pipeline appearing, a `CLAUDE.md` landing, a rename

## Step 3: Say what the movement means

A single week of change is noise; a direction across runs is a pattern. Where
there is only one prior run, say that the trend is not yet established rather
than over-reading two data points.

## Step 4: Write it up

`~/corpus/inform/Working_area/RepoAnalysis/YYYY-MM-DD-track.md`

Short by design. If nothing material changed, say so in two lines — do not pad
a quiet week into a report.
