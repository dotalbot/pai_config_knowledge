---
id: 20260829-175925_ok-this-is-what-i-got-back-please
slug: ok-this-is-what-i-got-back-please
status: recommended
source: directive
created: 2026-08-29T17:59:25.903Z
expires: 2026-09-28T17:59:25.903Z
confidence: 0.9
target_surface: unknown
session_id: 441e9228-7582-40e5-ae97-ddfc8cf63223
ledger_id: 
evidence:
  - "session:441e9228-7582-40e5-ae97-ddfc8cf63223"
---

## Claim

ok this is what I got back, please review: ADDENDUM: required draft-publication safety

The revised output policy is accepted:

- output: local → done/, no Obsidian write
- output: vault → review/, pinned INBOX draft retained
- ConveyorPublish and the pin/unpin protocol remain unchanged

Before implementation, add the following requirements.

======================================================================
1. NEVER OVERWRITE AN EXISTING DRAFT
======================================================================

ConveyorWorker must never use an ordinary truncating write against the final
INBOX draft path.

The final path is deterministic:

  ~/obsidian/00 INBOX/DRAFT — <slug>.md

Publish it using an exclusive, atomic transaction:

1. Generate the draft bytes deterministically.
2. Write them to an owner-only temporary file in the same INBOX directory.
3. Use exclusive creation/no-f

## Current State

Stated by the principal in-session; not yet encoded in infrastructure.

## Recommendation

(not yet drafted)

## Notes

- 2026-08-29T17:59:25.903Z — created (source: directive)
