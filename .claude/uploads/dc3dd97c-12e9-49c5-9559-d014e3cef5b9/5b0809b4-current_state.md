# Current State Handoff

Prepared: 2026-06-05

This file captures the working history and current state from this OpenCode session as completely as possible.

## User Request Context

The user asked:

- "What did we do so far?"
- Then asked to continue next steps or stop if unclear.
- Then asked to do option 1 from the recommendations and stop.
- Then asked to write the session history to `/tmp/current_state.md`.

## Main Outcome

The session focused on documenting prior LogK work and completing Hindsight setup/verification for the `logk-main` memory bank.

The latest meaningful state is:

- Current LogK source-of-truth checkout is `/home/jellyfish/repo/logk`.
- Current branch there is `main`.
- Current remote there is `git@github.com:dotalbot/logk.git`.
- That checkout was clean when checked.
- Legacy checkout `/home/jellyfish/repo/logk.old` also exists.
- `logk.old` is on branch `stage-1-golden-spine` with Bitbucket remote `git@bitbucket.org:dominic_talbot/logk.git`.
- Hindsight bank `logk-main` was seeded/refreshed and verified.
- Hindsight still contains stale `/home/jellybot/logk` observations, but corrected `/home/jellyfish/repo/logk` recall now ranks first.

## Repo Work Already Completed Before This Session Summary

The earlier work, as summarized in the session, included:

### Migration And GitHub

- Confirmed old `../logk.old` content was migrated into the current GitHub repo.
- Committed and pushed migration artefacts:
  - Commit: `08ff922 feat(content-lineage-and-versioning-discovery): restore migrated content lineage work`
- Current GitHub repo path/remote later confirmed as:
  - Path: `/home/jellyfish/repo/logk`
  - Branch: `main`
  - Remote: `git@github.com:dotalbot/logk.git`

### SPEC-092 Golden Spine Control Plane

- Implemented, tested, reviewed, committed, and pushed SPEC-092.
- Commit:
  - `19d560c feat(golden-spine-control-plane-foundation): add spine doctor`
- Added CLI command:
  - `logk spine doctor [--json]`
- Added/updated files:
  - `docs/spec/SPEC-092-golden-spine-control-plane-foundation.md`
  - `docs/guides/golden-spine-control-plane.md`
  - `logk/spine_control_plane.py`
  - `tests/test_spine_doctor_cli.py`
  - `docs/index.md`
  - `docs/strategy/LOGK_SPEC_ROADMAP.md`
- SPEC-092 test output before commit:
  - `.venv/bin/python -m pytest -x -q`
  - `1709 passed, 1 warning`

SPEC-092 behaviour remembered:

- `logk spine doctor [--json]` is read-only.
- It validates Golden Spine control-plane integrity.
- It checks schema/state issues, frontmatter mirror drift, client-readiness/evidence checks, ledger references, and stable exit codes.
- SQLite is authoritative; frontmatter mirrors are reported as drift if contradictory.
- No automatic repairs happen in V1.

### Hybrid Vault Guide

- Added hybrid vault step-by-step operator guide with Mermaid diagrams:
  - `docs/guides/hybrid-vault-operator-guide.md`
- Committed and pushed:
  - `b53200f docs(hybrid-vault): add operator guide`
- Verified latest repo status was clean after that push.

Hybrid vault decisions captured:

- Keep current vault intact.
- Build a side-by-side candidate vault.
- Do not destructively clean-start the current vault.
- Candidate vault path:
  - `/home/jellyfish/repo/logk-hybrid-candidate/vault`
- Commands must set both:
  - `KBASE_VAULT`
  - `LOGK_INDEX_DB`
- First hybrid task for the user is source judgement, not tooling:
  - select 10-15 sources for the three pilot anchors.

Pilot Golden Spine anchors:

- `copilot-studio-governance_gs`
- `client-ai-maturity-model_gs`
- `people-process-policy-technology_gs`

Golden Spine control-plane decisions:

- Golden Spine should become canonical authority/control plane.
- Implementation should remain narrow, CLI-first, and read-only first.
- Use both SQLite and frontmatter for Golden Spine authority:
  - SQLite authoritative.
  - Frontmatter mirror.
- Use dedicated ledger:
  - `vault/meta/spine_decisions.jsonl`
- Suppressed pages are de-boosted/ranked lower, not silently hidden.
- Client-ready levels:
  - `conversation`
  - `proposal`
  - `formal_deliverable`

## Hindsight Setup Work Completed In This Session

### Handoff File Read

Read `/tmp/handoff.md`.

Important details from that handoff:

- Hindsight endpoint from this environment should be:
  - `http://192.168.1.1:18888`
- Avoid `http://jellyhome:18888` from this environment because `jellyhome` resolves incorrectly to `127.0.1.1`.
- Hindsight version observed:
  - `0.6.2`
- Existing Hindsight bank for LogK:
  - `logk-main`
- Recommended not to create a new bank unless intentionally creating a variant such as `logk-opencode-main`.

Useful Hindsight paths used or noted:

- `GET /health`
- `GET /version`
- `GET /v1/default/banks`
- `POST /v1/default/banks/{bank_id}/import`
- `POST /v1/default/banks/{bank_id}/memories`
- `POST /v1/default/banks/{bank_id}/memories/recall`
- `GET /v1/default/banks/{bank_id}/stats`
- `GET /v1/default/banks/{bank_id}/documents`
- `GET /v1/default/banks/{bank_id}/tags`
- `GET /v1/default/banks/{bank_id}/operations`
- `POST /v1/default/banks/{bank_id}/mental-models/{mental_model_id}/refresh`

### Endpoint And Bank Verification

Verified Hindsight endpoint:

- `http://192.168.1.1:18888`
- `/health` returned healthy earlier:
  - `{"status":"healthy","database":"connected"}`
- `/version` returned:
  - `0.6.2`

Observed banks included:

- `jellyssh-main`
- `home-network-main`
- `logk-main`
- `portfolio-intel-main`
- `hermes-main`
- `global-dominic`

### Hindsight Template And Durable Content

Applied LogK Hindsight template to `logk-main`.

Created/verified mental model:

- `logk-architecture-and-workflow`

Created directive:

- `preserve-logk-invariants`

Seeded 18 durable LogK docs into `logk-main`.

Seed operation:

- Operation ID: `45dc2f0d-a5ed-45d7-a2b2-3bfe4f98f574`
- Initial status: pending for many polls.
- Completed at poll 44.
- Final status:
  - `completed`
  - `error: null`

### Mental Model Refresh

Refreshed mental model:

- Mental model: `logk-architecture-and-workflow`
- Operation ID: `ea539a9e-307b-4e16-8152-f3111d7683db`
- Status: completed after polling.

Later, after corrections, refreshed again:

- Operation ID: `c885d281-eb23-4cbc-ac4e-1b1f3d227906`
- Status: completed.

Final refresh after refreshed seed docs:

- Operation ID: `f657067b-529f-4ac0-b29d-d21479a98e6a`
- Status: completed.

### Initial Hindsight Verification

Stats after initial seed included:

- `bank_id`: `logk-main`
- `total_nodes`: 1561
- `total_links`: 24641
- `total_documents`: 28
- `pending_operations`: 0
- `failed_operations`: 0
- `pending_consolidation`: 810

Documents listed after initial seed included 28 IDs such as:

- `logk:spec-090`
- `logk:spec-092`
- `logk:guide-content-lineage`
- `logk:guide-hybrid-vault-operator`
- `logk:spec-091`
- `logk:opencode-handover-summary`
- `logk:architecture-hld`
- `logk:claude`
- `logk:spec-089`
- `logk:docs-index`
- `logk:spec-roadmap`
- `logk:guide-core-collection-membership`
- `logk:guide-fresh-vault-bootstrap`
- `logk:architecture-lld`
- `logk:guide-golden-spine-control-plane`
- `logk:living-intelligence-strategy`
- `logk:sqlite-knowledge-layer`
- `logk:agents`
- older IDs like `logk-docs-index`, `logk-spec-roadmap`, `logk-architecture-lld`, etc.

Tags after initial seed included:

- `logk`
- `seed`
- `branch:main`
- `repo:/home/jellybot/logk`
- `spec`
- `architecture`
- `roadmap`
- `specs`
- `golden-spine`
- `guide`
- `content-lineage`
- `workflow`
- `hybrid-vault`
- `collections`
- `docs`
- `opencode`
- `strategy`

### Recall Probes Run

Recall probes were run for:

- Source-of-truth files and non-negotiable workflow rules.
- Hybrid vault workflow.
- Golden Spine control-plane foundation.
- Repo location/current source-of-truth.
- Hybrid vault environment variables.
- Golden Spine `logk spine doctor`.

Good recall results included:

- Raw sources are append-only and ground truth.
- Generated content must trace to Layer 1-3 evidence.
- Hybrid vault operations require `KBASE_VAULT` and `LOGK_INDEX_DB` for side-by-side work.
- Commands that mutate vault must not be run until target vault is confirmed.
- `logk spine doctor [--json]` reports Golden Spine integrity/readiness/drift findings.
- SQLite is authoritative for Golden Spine curation state.

## Repo Location Stale Memory Discovery And Correction

### Discovery

Recall initially surfaced stale location facts claiming:

- Current LogK source of truth was `/home/jellybot/logk`.

This conflicted with the current environment and checkout.

### Verification Of Local Checkouts

Checked `/home/jellyfish/repo/logk.old`:

- Path: `/home/jellyfish/repo/logk.old`
- Branch: `stage-1-golden-spine`
- Remote: `git@bitbucket.org:dominic_talbot/logk.git`
- Worktree had changes:
  - Modified `graphify-out/GRAPH_REPORT.md`
  - Modified `graphify-out/graph.json`
  - Untracked `vault/meta/spec084-smoke-decisions.jsonl`
  - Untracked `vault/sources/web/raw/web-0186b5a6/`
  - Untracked `vault/sources/web/raw/web-603c2084/`
  - Untracked `vault/sources/web/web-603c2084.md`

Checked `/home/jellyfish/repo/logk`:

- Path: `/home/jellyfish/repo/logk`
- Branch: `main`
- Remote: `git@github.com:dotalbot/logk.git`
- Worktree clean at that check.

Directory `/home/jellyfish/repo` contained:

- `home-network/`
- `jellydev_claude_work_setup/`
- `logk_backup_tar.gz`
- `logk.old/`
- `logk/`
- `temp/`

Conclusion:

- `/home/jellyfish/repo/logk` is the current LogK checkout.
- `/home/jellyfish/repo/logk.old` is legacy.

### Corrective Memory Added

Added corrective Hindsight memory document:

- Document ID: `logk:repo-location-current`
- Operation ID: `a046b97d-9628-4ea1-8d06-35ca03499c42`
- Status: completed.

Corrective content stated:

- Current LogK source-of-truth checkout is `/home/jellyfish/repo/logk` on branch `main` with GitHub remote `git@github.com:dotalbot/logk.git`.
- Local `/home/jellyfish/repo/logk.old` is legacy on branch `stage-1-golden-spine` with Bitbucket remote `git@bitbucket.org:dominic_talbot/logk.git`.
- Prefer `/home/jellyfish/repo/logk` unless user explicitly asks to inspect or compare `logk.old`.
- Do not reinforce stale `/home/jellybot/logk` path.

Document verification showed:

- ID: `logk:repo-location-current`
- `text_length`: 476
- `memory_unit_count`: 4
- Tags:
  - `correction`
  - `repo-location`
  - `logk`
  - `workflow`

### Stale Seed Context Remained

After adding correction, broad recall still ranked stale `/home/jellybot/logk` facts above the correction.

Stale facts appeared from older seeded document contexts and observations, including IDs like:

- `logk-architecture-lld`
- `logk-docs-index`
- `logk-spec-roadmap`
- `logk-opencode-handover-summary`
- `logk-claude-brief`

### Refreshed Older Seed Documents From Current Checkout

Upserted/refreshed 7 older seed document IDs from current `/home/jellyfish/repo/logk` checkout:

- `logk-architecture-hld` from `docs/architecture/LOGK_HLD.md`
- `logk-architecture-lld` from `docs/architecture/LOGK_LLD.md`
- `logk-spec-roadmap` from `docs/strategy/LOGK_SPEC_ROADMAP.md`
- `logk-docs-index` from `docs/index.md`
- `logk-opencode-handover-summary` from `docs/opencode/opencode-handover-summary.md`
- `logk-claude-brief` from `CLAUDE.md`
- `logk-agents` from `AGENTS.md`

Refresh operation:

- Operation ID: `e00e1118-69a4-4cfb-8d22-2f7239c95461`
- Status: completed after polling.

After this, refreshed mental model again:

- Operation ID: `f657067b-529f-4ac0-b29d-d21479a98e6a`
- Status: completed.

### Corrected Recall Result

Final repo-location recall ranked current path first:

- `Current LogK source-of-truth checkout is located at /home/jellyfish/repo/logk on branch main with GitHub remote git@github.com:dotalbot/logk.git.`

But stale observation still appeared second:

- `Current source of truth for logk is /home/jellybot/logk on main branch, while historical path mentioned is /home/jellyfish/repo/logk on branch stage-1-golden-spine.`

Other corrected facts also appeared:

- `/home/jellyfish/repo/logk.old` is legacy.
- Do not reinforce stale `/home/jellybot/logk` path.
- Prefer `/home/jellyfish/repo/logk` for current work.

## Final Hindsight Verification Results Before Cleanup Attempt

Final stats before stale cleanup attempt showed roughly:

- `bank_id`: `logk-main`
- `total_documents`: 29
- `total_nodes`: 1747
- `total_links`: 29704
- `pending_operations`: 1
- `failed_operations`: 0
- `pending_consolidation`: 1123
- `failed_consolidation`: 0

Recent operations showed:

- Completed mental-model refresh `f657067b-529f-4ac0-b29d-d21479a98e6a`
- One pending consolidation operation:
  - `d2f5d3f8-6769-40f5-9f07-6905e09e2a79`

Final top tags included:

- `logk`: 1747
- `branch:main`: 565
- `roadmap`: 491
- `specs`: 491
- `repo:/home/jellyfish/repo/logk`: 484
- `architecture`: 463
- `spec`: 302
- `workflow`: 173
- `guide`: 172
- `golden-spine`: 161
- `docs`: 145
- `hybrid-vault`: 115
- `content-lineage`: 111
- `seed`: 91
- `repo:/home/jellybot/logk`: 81

## Option 1 Cleanup Attempt

The user asked to "do one and then stop", where option 1 was:

- Clean/purge stale Hindsight `/home/jellybot/logk` facts if the API supports safe deletion.

### API Investigation

Fetched OpenAPI schema from:

- `http://192.168.1.1:18888/openapi.json`

Relevant delete endpoints found:

- `DELETE /v1/default/banks/{bank_id}/documents/{document_id}`
  - Deletes a document and all associated memory units and links.
- `DELETE /v1/default/banks/{bank_id}/observations`
  - Clears all observations for a memory bank.
- `DELETE /v1/default/banks/{bank_id}/memories/{memory_id}/observations`
  - Clears observations derived from a specific memory and resets for reconsolidation.
- `DELETE /v1/default/banks/{bank_id}/memories`
  - Clears memory bank memories, optionally by type.
- Other delete endpoints for bank, directives, mental models, config, webhooks, operations.

No explicit endpoint was found for deleting one observation by observation/memory ID.

`GET /v1/default/banks/{bank_id}/memories/{memory_id}` exists, but no DELETE for individual memory IDs was shown.

### Stale Documents Check

Checked documents tagged with `repo:/home/jellybot/logk`:

- Result: `[]`

Conclusion:

- No stale-tagged documents remain.
- Therefore document delete endpoint could not safely target stale docs.

### Stale Memory/Observation Check

Listed memory units mentioning `/home/jellybot/logk`.

Important finding:

- Query by raw path found many items because of broad search behaviour.
- A full list with tag filtering showed:
  - Total memory units: 1783
  - Stale-tagged memory units: 81

All 81 stale-tagged memory units were observations with tags:

- `seed`
- `logk`
- `repo:/home/jellybot/logk`
- `branch:main`

Direct inspection of the most problematic stale observation:

- ID: `b12a1783-903c-4115-815c-dc30006812b7`
- Type: `observation`
- Text: `Current source of truth for logk is /home/jellybot/logk on main branch, while historical path mentioned is /home/jellyfish/repo/logk on branch stage-1-golden-spine.`
- `document_id`: null
- Tags:
  - `seed`
  - `logk`
  - `repo:/home/jellybot/logk`
  - `branch:main`

Counted stale observations specifically:

- `type=observation`
- Total observations: 348
- Stale observations with `repo:/home/jellybot/logk`: 81

### Cleanup Decision

No deletion was performed because:

- There is no scoped safe endpoint to delete the 81 stale observations only.
- `DELETE /observations` would delete all 348 observations, not just stale ones.
- `DELETE /memories` is broad and destructive.
- `DELETE /documents/{document_id}` was not applicable because stale-tagged documents were already gone.

Final user-facing result:

- No stale-tagged documents remain.
- 81 stale `/home/jellybot/logk` entries remain as consolidated observation memory units.
- Hindsight does not expose a scoped delete endpoint for individual observations or tag-filtered deletion.
- Did not use broad clear-all-observations endpoint because it would delete 348 observations, not just the stale 81.
- Current recall is corrected enough that `/home/jellyfish/repo/logk` ranks first, but stale observations still exist underneath.

## Important Current Repo Facts

Current primary checkout:

- Path: `/home/jellyfish/repo/logk`
- Branch: `main`
- Remote: `git@github.com:dotalbot/logk.git`
- Use this for current LogK work.

Legacy checkout:

- Path: `/home/jellyfish/repo/logk.old`
- Branch: `stage-1-golden-spine`
- Remote: `git@bitbucket.org:dominic_talbot/logk.git`
- Has local uncommitted/untracked changes.
- Only inspect/compare if explicitly asked.

## Important Hindsight Facts

Endpoint:

- `http://192.168.1.1:18888`

Bank:

- `logk-main`

Version:

- `0.6.2`

Mental model:

- `logk-architecture-and-workflow`

Directive:

- `preserve-logk-invariants`

Corrective repo-location document:

- `logk:repo-location-current`

Stale observations still present:

- 81 memory units tagged `repo:/home/jellybot/logk`.
- These are consolidated observations, not documents.
- Current API does not provide safe scoped deletion for these only.

## Manual Environment Variables For Hybrid Candidate Work

When operating the side-by-side candidate vault, set both:

```bash
export KBASE_VAULT=/home/jellyfish/repo/logk-hybrid-candidate/vault
export LOGK_INDEX_DB=/home/jellyfish/repo/logk-hybrid-candidate/vault/.logk/logk_index.sqlite
```

Do not run vault-mutating commands such as `logk intake`, `logk compile`, or similar until the target vault and index path are confirmed.

## Recommended Next Steps If Continuing Later

1. Do not keep trying to delete stale `/home/jellybot/logk` observations unless Hindsight adds a scoped observation delete API or the user approves clearing all observations.
2. Start selecting 10-15 sources for the hybrid vault pilot.
3. Focus those sources around the three pilot Golden Spine anchors:
   - `copilot-studio-governance_gs`
   - `client-ai-maturity-model_gs`
   - `people-process-policy-technology_gs`
4. Use `/home/jellyfish/repo/logk` for current work, not `/home/jellyfish/repo/logk.old`.
5. Before architecture/codebase questions, follow project rule to read `graphify-out/GRAPH_REPORT.md` or use graphify query paths as appropriate.

## Caveats

- This file is written from the current session memory and command outputs.
- Some earlier commit/push details were reported from the session summary rather than re-verified in this final write step.
- No destructive Hindsight delete operation was performed.
- No repo files were modified by this final handoff write; only `/tmp/current_state.md` was created.
