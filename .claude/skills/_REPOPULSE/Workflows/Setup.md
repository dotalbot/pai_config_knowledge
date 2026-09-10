# Setup Workflow

How the Azure DevOps organisation itself is configured — the rules work has to
move through, above the repo layer.

## Step 1: Establish what you can actually see

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Estate.ts probe
```

Read-only PATs commonly lack Work Items, Release and Service Connections. Note
the DENIED areas now, and state them in the written output — an analysis that
silently omits boards reads as complete when it is not.

## Step 2: Read the configuration

```bash
bun run ~/.claude/skills/_REPOPULSE/Tools/Estate.ts setup > /tmp/rp-estate.json
```

What matters, in rough order of how much it tells you:

- **Branch policies.** A minimum-reviewer policy is process; its absence means
  any review you observe is voluntary. Check before judging review culture.
- **Build definitions versus pipeline YAML in the repo.** These are different
  things. Authored YAML with `trigger: none` and no registered definition means
  automation exists on paper and runs by hand.
- **Teams.** Their names usually reveal whether backlogs are organised around
  products, business streams, or neither.
- **Iterations.** Sprints configured, or empty. Sprints defined only in a
  sandbox project is a common tell that cadence tooling was tried and dropped.
- **Service connections.** Which environments the org can actually reach.

## Step 3: Compare intent against operation

The finding is usually in the gap: capability that exists but is switched off,
policy that is assumed but not configured, structure in the boards that has no
counterpart in the repos.

## Step 4: Write it up

Either its own file, `YYYY-MM-DD-devops-setup.md`, or a section within a
cross-repo analysis. Include a `flowchart TD` showing how a change actually
travels from branch to deployed artefact, marking each point where a gate is
absent.
