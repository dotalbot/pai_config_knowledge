# CrossRepo Workflow

The whole estate at once: what every repo is trying to do, and the common thread
in how work is conducted.

## Step 1: Scan everything

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Pulse.ts scan > /tmp/rp-scan.json
```

## Step 2: Classify every repo by intent

Group by what the repo is FOR, not by project or size. Typical groupings:

- **Delivery** — client or product work with pipelines and solution artefacts
- **Knowledge** — research, documentation, reference material
- **Enablement** — upskilling, certifications, playgrounds
- **Experiment** — spikes and tests, often small and short-lived
- **Personal** — one person's own space

Read the tree and README where the name is ambiguous. State the classification
and the evidence for it, so a wrong call can be corrected.

## Step 3: Find the thread

This is the actual deliverable. Look for:

- **Who works where.** Fold identities first. Do contributors overlap, or does
  each person own a private set of repos? Non-overlap is a collaboration
  finding, not a scheduling one.
- **Where review happens** and where it does not.
- **What the estate does with finished work** — is anything archived, or does
  everything stay live-but-dormant?
- **Whether tooling is shared.** Same pipeline YAML, same `CLAUDE.md`
  conventions, same folder shapes across repos means a house style exists.
  Divergence means each repo was set up from scratch.
- **What the dormant repos have in common.** Often they share an owner, an era,
  or a purpose that stopped mattering.

State the thread as a claim someone could disagree with. "Work is organised
around individuals rather than teams, and review is the exception" is a finding.
"There are 17 repos with varying activity" is not.

## Step 4: Write it up

`~/corpus/inform/Working_area/RepoAnalysis/YYYY-MM-DD-cross-repo.md`

Required diagrams:
- `mindmap` — the estate grouped by intent
- `flowchart LR` — people to the repos they own, showing overlap and its absence
- `gantt` or timeline — active versus dormant

Close with what the pattern implies. Where a finding is a risk (single ownership
of something load-bearing, unreviewed delivery work), say so plainly and once.
