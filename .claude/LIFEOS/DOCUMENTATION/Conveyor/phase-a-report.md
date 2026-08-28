# Phase A — dry-run inventory of processing/

Read-only. No timer installed. No payload content read beyond bounded
metadata and size/hash checks.

Run 2026-08-27. Seven directory jobs, zero loose-file legacy jobs.

| Job ID | Age | kind | output | payload | hash | shape |
|---|---:|---|---|---:|---|---|
| `…071210-14ay--ask--conveyordesk-live-smoke` | 7h | ask | **local** | 65 B | MATCH | ok |
| `…075123-ubcf--unknown--live-app` | 7h | unknown | vault | 61 B | MATCH | ok |
| `…075204-k1f7--unknown--live-app` | 7h | unknown | vault | 61 B | MATCH | ok |
| `…075251-qk8x--ask--live-app` | 7h | ask | vault | 61 B | MATCH | ok |
| `…091549-ol2k--unknown--tda340-ms-copilot-studio…` | 5h | unknown | vault | **31,649 B** | MATCH | ok |
| `…100955-omsk--ask--live-app` | 4h | ask | vault | 61 B | MATCH | ok |
| `…135348-gzby--ask--notification-check` | 0h | ask | vault | 58 B | MATCH | ok |

**All seven validate cleanly.** No symlinks anywhere in the job directories,
payloads or metadata. All metadata parses within bounds. Every declared SHA-256
matches the payload on disk. All kinds are in the allowed set.

## Observations

- **Six of seven are tiny** (58–65 bytes) and named `live-app`,
  `conveyordesk-live-smoke`, `notification-check`. These read as transport
  acceptance fixtures from ConveyorDesk development, not real work.
- **One is real content**: `…ol2k--unknown--tda340-ms-copilot-studio-environment-and-path-to-production`,
  31.6 KB markdown, kind `unknown`, output `vault`. Title suggests genuine
  material on Copilot Studio environments and path to production.
- **Six declare `output: vault`.** Under §9 that is a real vault write once
  gates pass. Worth deciding deliberately rather than by timer.
- **Three declare `kind: unknown`**, which the worker would need to infer.

## Operator decision required (§13 Phase A)

| Job | Recommendation | Why |
|---|---|---|
| Six small fixtures | **Archive or delete** | Transport tests, already served their purpose; processing them writes six near-empty notes to the vault |
| `…ol2k…tda340…` | **Process deliberately, after the fixture run** | The only real content. Deserves a considered run, not a backlog sweep |

**Nothing has been processed.** Awaiting explicit approval per §3 non-goals
and §13 Phase D.
