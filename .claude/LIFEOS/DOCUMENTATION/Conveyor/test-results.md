# ConveyorWorker — deterministic test results

Worker 1.0.0, 2026-08-27. Every fixture created, run, and removed; the seven
backlog jobs were never touched.

## Phase B — isolated fixture (§13 Phase B)

| Check | Result |
|---|---|
| Harmless DOCX reaches `done/` on a manual run | PASS |
| Payload sha256 unchanged through the move | PASS — `0e55c53e…` identical before and after |
| `output: local` produced no vault write | PASS — 0 vault files touched |
| Heartbeat written | PASS — `done:1 failed:0 needs:0 skipped:7` |
| Inventory records every file with hashes | PASS — 3 files |

## Negative fixtures (§14)

| Fixture | Expected | Actual | Evidence |
|---|---|---|---|
| `nt01` secret-shaped (`sk-live…`) | `needs_input`, no leak | **PASS** | No `extract.txt` written; secret absent from `question.md`, `audit.md`, and the worker log. Present only in the retained original, which is required |
| `nt02` injection-shaped | `needs_input`, not obeyed | **PASS** | Instructions treated as data; `question.md` sanitised, does not reproduce the text |
| `nt03` valid control | `done` | **PASS** | Completed in the same scan as three failures — per-job failure does not wedge the queue |
| `nt04` malformed (two payloads) | `failed` | **PASS** | Reason names the violation |
| `nt05` corrupt DOCX (`NOTAZIP`) | `needs_input`/`failed` | **PASS** — `needs_input` | OOXML integrity check refused it before pandoc |

**Single scan result:** `done=1 failed=1 needs_input=3 skipped=7`. One valid job
completed alongside four rejections — the isolation requirement holds.

## Idempotency and crash safety (§5, §14)

| Check | Result |
|---|---|
| Re-processing a job whose destination exists | **PASS** — fails safe: `destination exists: …/done/…`, routed to `failed/`, the completed job untouched |
| Crash leaves job in `processing/` for the next run | By construction — the terminal `rename` is the only commit point |
| Timer non-overlap | `Type=oneshot`; systemd will not start a second run while one is active |

## Backlog guard (§3, §13 Phase D)

`WORKER_EPOCH = 20260827-140000`. Jobs claimed before it are skipped unless
listed in `~/conveyor/approved-backlog.txt`, which does not exist.

**Every run reported `skipped=7`.** The seven historical jobs have never been
read beyond bounded metadata, and were not consumed by enabling the timer.

## Not verified / not done

- **Vault publication is not implemented.** Jobs declaring `output: vault` are
  processed with output kept local, and the audit records the deferral. Spec §9
  allows vault writes after gates pass; worker v1 deliberately does not, because
  a timer that writes into a cloud-synced vault deserves its own decision.
- **Pulse integration (§12) not built.** Heartbeat and JSONL exist for it to
  read; no Pulse module was added.
- **OCR, LibreOffice, xlsx/pptx paths untested.** The matrix in §7 lists them;
  worker v1 implements `.md/.txt/.csv`, `.docx`, `.eml` and refuses the rest
  loudly rather than guessing.
- `.msg` unsupported, as specified.

## Cross-check against the Hermes handover (2026-08-27)

Hermes' Mac-side handover names the missing worker as the primary blocker
(§15) and lists automatic DOCX processing as an open gap (§17). Both were
closed the same day; the handover is filed in the vault with those corrections
marked.

Contract points his document pins down that this worker already honours:

- Jobs are atomic directories containing exactly `payload.<ext>` + `meta.json`.
- `meta.json` is authoritative.
- `STAGED` from the receipt helper permits an idempotent commit retry only,
  never another rsync. **The worker never calls the helper**, so it cannot
  violate this — worth stating because it is the sort of rule a later change
  could break silently.
- `processing/` must not be mass-consumed. Enforced by `WORKER_EPOCH` plus
  `approved-backlog.txt`.

**One deliberate divergence.** His §18.7 requires `output: local` never reach
the vault. Worker v1 goes further: nothing publishes to the vault at all yet,
including jobs declaring `output: vault`. Publication sits behind the review
gate specified in `CONVEYOR_RECIPES_SPEC.md`.

**Still Dom's to verify**: whether the ConveyorDesk transport policy on the Mac
is disabled (his §14, marked VERIFY REQUIRED). `~/conveyor/new` is empty, which
is consistent with the app being offline but does not prove it.

---

# ConveyorWorker 1.1.1 — output containment

Worker **1.1.1**, 2026-08-29. Branch `fix/conveyor-worker-output-containment`
from `8d98e86`. Supersedes 1.0.0 for output policy; every 1.0.0 safety property
was re-run and still holds.

**Worker SHA-256:** `4c291acfc80239ae2e5209f4301c73ecab4a8a27e637c8cff73ed952d18c97e1`
**1.1.0 (defective):** `c474004b785adb5d5ec4a9836b4ce3814d3b91f1796c637e42d54d9c782aebe4`

## The defect

1.1.0 called `writeDraft()` unconditionally, **before** any output-policy
branch, so **every** successful job wrote `~/obsidian/00 INBOX/DRAFT — <slug>.md`
— including jobs declaring `output: local`. Second defect: `processJob` returned
`state: "review"` unconditionally, so local jobs never reached `done/`.

**Latent, never realised.** `00 INBOX` held zero DRAFT files and the timer was
disabled throughout.

## Behaviour in 1.1.1

| `meta.output` | Terminal | Vault write |
|---|---|---|
| `local` | `done/` | **none** — `stage1-draft.md` stays in the job directory |
| `vault` | `review/` | one pinned INBOX draft, atomic no-replace |

`ConveyorPublish` and the pin/unpin protocol are unchanged.

## Test matrix — 27/27, all committed and executable

Suite: `LIFEOS/TOOLS/tests/ConveyorWorker.containment.test.ts`. Every child
process receives **both** `HOME` and `CONVEYOR_HOME` pointed at a fixture tree.

Run: `bun test LIFEOS/TOOLS/tests/ConveyorWorker.containment.test.ts`

| # | Case | Result |
|---|---|---|
| 1 | `output:local` → `done/`, zero files beneath the fixture vault | PASS |
| 2 | `output:vault` → `review/`, pinned draft, honest `vault_writes` | PASS |
| B | Draft byte-stable across days — retry takes case A | PASS |
| B2 | User-edited draft preserved byte-for-byte, never repinned | PASS |
| C | Unrelated draft at same path → fail-closed collision | PASS |
| C2 | Symlinked draft path rejected without following it | PASS |
| 3a | Secret in `meta.context` → no draft, never reproduced | PASS |
| 3b | Injection in `meta.context` → no draft, not obeyed | PASS |
| 3c | Oversized `meta.context` → fails closed before any draft | PASS |
| 4 | Secret in payload → `needs_input`, no vault write | PASS |
| 5 | Malformed two-payload job fails; valid job still completes | PASS |
| 6 | Payload hash contradicting `meta.json` → fails closed | PASS |
| 7 | Existing terminal destination → fails safe | PASS |
| 8 | Pre-epoch backlog skipped (`skipped=1`) | PASS |
| 9 | Symlinked payload rejected | PASS |
| 10 | Stale worker temp swept; unrelated `.tmp` untouched | PASS |
| 11 | Heartbeat counts `done` and `review` separately | PASS |
| F1a | fsync failure after successful link still records the draft | PASS |
| F1b | Temp-unlink failure after link still records the draft | PASS |
| F1c | Second directory-fsync failure still records the draft | PASS |
| F1d | Retry after post-link failure — one draft, one job | PASS |
| F1e | User-edited draft survives a post-link failure and retry | PASS |
| F2 | Short-write path reconstructs exact bytes (17-byte chunks) | PASS |
| F4a | Crash after draft visible, before inventory — retry converges | PASS |
| F4b | Crash after inventory, before rename — retry converges | PASS |
| F4c | Crash retry never overwrites an edited draft | PASS |
| F5 | Unpinned draft discovered by `ConveyorPublish --dry-run` | PASS |

F5 invokes the real publisher against the fixture tree and asserts
`acted=1`, `still_pinned=0`, and that the dry run wrote nothing.

## RED/GREEN

RED against 1.1.0 with **only** the `CONVEYOR_HOME` indirection backported, so
failures isolate the defect rather than the old code's inability to be
redirected: **12 fail / 5 pass**. Test 1 failed at the `done/` assertion.
GREEN on 1.1.1: **27 pass / 0 fail**.

## Implementation notes

- **`link()`, never `rename()`.** POSIX rename *replaces*; `link()` fails
  `EEXIST`, which is the reconciliation trigger. Verified on ext4.
  `EPERM`/`EOPNOTSUPP`/`EXDEV` fail closed rather than degrading.
- **The link is the visibility commit.** A post-link fsync or unlink failure is
  cleanup: recorded in `audit.md`, never reported as "nothing was written".
  Reporting it as a collision would have made inventory omit a draft plainly
  sitting in INBOX.
- **`writeSync` is looped** on its returned byte count. Zero progress is fatal;
  a partial draft is never fsynced or linked.
- **`fsyncStrict()`** added because `durable()` swallows every error, which the
  transaction ordering cannot tolerate.
- **`draftBytes()` is pure.** `date:` derives from `meta.source.dropped_at`,
  falling back to the job id prefix. Previously `new Date()`, which made a
  next-day retry byte-different for identical input.
- **Crash seams exit the process** rather than throwing. A thrown error is
  caught by the per-job handler and mis-recorded as a failed job, which is not
  the on-disk state a real crash leaves. Found while writing F4b.
- **Temp sweep is narrow:** worker prefix + job id + direct child + regular
  non-symlink + owned by us + older than an hour + not the live temp.

## Not verified / still open

- **`output` vocabulary mismatch unfixed, out of scope.** `~/conveyor/README.md`
  documents `vault | reply | both`; the worker implements `vault | local` and
  silently collapses anything unrecognised.
- **Crash coverage is two points, not six** (Dom's reduction). The terminal
  `moveTo` rename remains the only commit point.
- **The worker timer remains disabled** pending acceptance. Real queue and real
  `~/obsidian` verified byte-identical before and after every run.
