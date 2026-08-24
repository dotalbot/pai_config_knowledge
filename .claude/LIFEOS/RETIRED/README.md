---
last_updated: 2026-08-23
last_updated_by: da
convention: pai-freshness-v1
---

# Retired

Superseded skills and components, kept for their history rather than their code.

**Why they live here and not in `skills/`.** Claude Code loads every directory
under `skills/` that has a `SKILL.md` with valid frontmatter. A renamed copy is
still a loaded skill: `skills/LifeOS.backup-20260820-112821/SKILL.md` declared
`name: LifeOS`, so two skills competed for the same trigger words. Suffixing a
directory does not retire it. Moving it out of the tree does.

Nothing here is loaded. To restore one, move the directory back under `skills/`.

| Retired | Date | Superseded by | Kept because |
|---|---|---|---|
| `PAIUpgrade` | 2026-08-23 | `skills/Upgrade` (2026-08-20 migration) | `Logs/run-history.jsonl`, `State/`, and a `sources.json` that diverged from the replacement |
| `LifeOS.backup-20260820-112821` | 2026-08-23 | `skills/LifeOS` | Pre-migration snapshot of the installer, taken during the 7.40.4 upgrade |
