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
