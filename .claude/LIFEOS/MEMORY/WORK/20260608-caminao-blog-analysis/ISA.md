---
task: "Crawl caminao.blog and extract wisdom to Obsidian + PAI MEMORY"
slug: "20260608-caminao-blog-analysis"
effort: E2
phase: complete
progress: 100
mode: algorithm
started: "2026-06-08T00:00:00Z"
updated: "2026-06-08T00:00:00Z"
---

## Problem

Dom identified https://caminao.blog/ as written by a sophisticated thinker who uses dense language but delivers genuine insight. The knowledge is locked in an uncrawled blog. No extraction or structured archiving has happened. Without a structured entry in PAI MEMORY/KNOWLEDGE and Obsidian, these ideas won't compound across sessions.

## Goal

Crawl caminao.blog, extract the author's most valuable ideas and mental models via ExtractWisdom, and write the output to both Obsidian `02 Cards/Concepts/` (as a Note card) and `PAI/MEMORY/KNOWLEDGE/` (as a typed knowledge entry) so the content is retrievable in future sessions.

## Criteria

- [ ] ISC-1: firecrawl map of caminao.blog returns ≥5 URLs
- [ ] ISC-2: at least 3 blog posts fetched as clean markdown content
- [ ] ISC-3: ExtractWisdom extraction produces ≥5 dynamic sections
- [ ] ISC-4: extraction contains a One-Sentence Takeaway (≤20 words)
- [ ] ISC-5: extraction contains an "If You Only Have 2 Minutes" section
- [ ] ISC-6: extraction contains a References & Rabbit Holes section
- [ ] ISC-7: Obsidian note written to `02 Cards/Concepts/` directory
- [ ] ISC-8: Obsidian note has `type: note` in frontmatter
- [ ] ISC-9: Obsidian note has `status: draft` in frontmatter
- [ ] ISC-10: Obsidian note has `topic: enterprise-architecture` or similar tag
- [ ] ISC-11: Obsidian note file is non-empty (≥500 chars body)
- [ ] ISC-12: PAI MEMORY/KNOWLEDGE entry written to `KNOWLEDGE/People/` directory
- [ ] ISC-13: KNOWLEDGE entry has author name, role, and URL
- [ ] ISC-14: KNOWLEDGE entry cross-links to Obsidian note path
- [ ] ISC-15: KNOWLEDGE entry lists ≥3 core mental models or frameworks
- [ ] ISC-16: Anti: Obsidian note does not use HTML for content markdown supports
- [ ] ISC-17: Anti: no auth token appears in any URL used during crawl
- [ ] ISC-18: Obsidian note file readable by Obsidian (valid markdown, no syntax errors)

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | functional | firecrawl map output URL count | ≥5 | Bash |
| ISC-2 | functional | markdown content length per post | ≥200 chars | Bash |
| ISC-3 | functional | count ## headers in extraction output | ≥5 | Bash/Read |
| ISC-4 | functional | grep "One-Sentence Takeaway" in output | present | Bash |
| ISC-5 | functional | grep "If You Only Have 2 Minutes" in output | present | Bash |
| ISC-6 | functional | grep "References" in output | present | Bash |
| ISC-7 | functional | ls `02 Cards/Concepts/Caminao*` | file exists | Bash |
| ISC-8 | functional | grep "type: note" in Obsidian file | present | Bash |
| ISC-9 | functional | grep "status: draft" in Obsidian file | present | Bash |
| ISC-10 | functional | grep "topic:" in Obsidian file | present | Bash |
| ISC-11 | functional | wc -c on Obsidian file | ≥500 | Bash |
| ISC-12 | functional | ls KNOWLEDGE/People/Caminao* | file exists | Bash |
| ISC-13 | functional | grep author/role/url in KNOWLEDGE entry | present | Read |
| ISC-14 | functional | grep obsidian path in KNOWLEDGE entry | present | Read |
| ISC-15 | functional | grep "mental model" or framework count | ≥3 items | Read |
| ISC-16 | anti | grep `<div\|<p\|<span` in Obsidian file | absent | Bash |
| ISC-17 | anti | grep api_key in any URL string | absent | Bash |
| ISC-18 | functional | head of Obsidian file starts with `---` | present | Bash |

## Decisions

2026-06-08 — Output strategy: single Obsidian note covering full-blog author analysis (not per-post notes), plus one KNOWLEDGE/People entry. Per-post notes would fragment the value; the goal is understanding the author's mental model as a whole.
