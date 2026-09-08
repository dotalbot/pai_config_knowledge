---
name: Capture
description: "Saves anything worth remembering later into a searchable reference layer in Obsidian, and surfaces it unprompted when the subject comes up again. Takes any string — a URL, YouTube video or channel, article, site, GitHub repo, or a bare thought — classifies it, fetches and enriches it (author, date, 2-4 sentence summary, tags reconciled against the vault's existing vocabulary, links to related notes), and files it under ~/obsidian/Reference/. Every capture also writes a machine-readable index entry so JellyPai can search it in the terminal with Obsidian closed. Channel and site anchors are EARNED — created on explicit request or the third item from that source — and their child lists are regenerated from note frontmatter, never appended, so they self-heal. Deliberately NOT an inbox: reference material has no terminal state and carries no processing debt. Surfacing is always-on with a sleep control. USE WHEN capture, /capture, save this, save this link, remember this, save for later, bookmark, file this away, save this video, save this channel, save this article, save this repo, worth remembering, look at this later, what have I saved about, what did I save on, show me what I've captured, capture digest, capture sleep, capture wake. NOT FOR processed source write-ups (those live in Sources/ and are written by hand), work-confidential material (goes to ~/corpus/inform/, refused here), actionable tasks (those belong in 00 INBOX), or live web research (use Research)."
version: 1.0.0
effort: low
---

# Capture

Save something now; find it again when it matters.

## The one thing to hold onto

**This is not an inbox.** `00 INBOX` is a queue: everything in it must be processed
or discarded, and unprocessed items are debt. Reference material has no terminal
state. A link that surfaces during work on a subject three months later has done its
whole job without ever earning a write-up, and no guilt attaches to it.

Never add processing checkboxes, overdue flags, or backlog framing to anything this
skill produces.

## Invocation

```
/capture <anything>
```

- `/capture https://youtu.be/xyz` — a video
- `/capture https://youtube.com/@SomeChannel` — a channel anchor
- `/capture https://simonwillison.net/2026/some-post/` — an article
- `/capture https://github.com/org/tool` — a tool, enters the Vault Guide lifecycle
- `/capture Erica mentioned the MOD framework deadline is Christmas` — a bare snippet
- `/capture digest` — what has been accumulating, grouped by subject
- `/capture sleep 2h` / `/capture wake` — mute and unmute surfacing

## How a capture runs

**1. Classify.** Deterministic, model-free.

```bash
bun run ~/.claude/skills/Capture/Tools/Classify.ts "<input>"
```

Returns `kind` (video / channel / article / site / tool / snippet), the URL, and the
reason. State the chosen kind in one line rather than asking; Dom can correct it
afterwards.

**2. Check the boundary before fetching.** A work-domain URL is refused, not filed.
Say which domain and point at `~/corpus/inform/`. This gate fails closed.

**3. Fetch and enrich.** Use WebFetch for articles and sites. For YouTube use
`fabric -y <url>` for the transcript; if it is unavailable, fall back to title and
description and SAY SO in the note's provenance line. Never invent a summary you did
not read.

Produce:
- `title`, `author`, `published`, and `duration` for video
- `source` — the channel name or site domain. **Always set this.** It is what binds
  the item to its anchor; without it the note never counts toward the threshold
- a **2-4 sentence summary of what it actually argues**, not a description of what it
  is about. "Argues that steelmanning fails when the opponent's position is
  incoherent" beats "a video about steelmanning"
- 3+ subject tags

**When you have a transcript or full article text, fill the rich sections too.**
A one-paragraph note loses the quotable lines and the how-to spine — the two things
worth coming back for. Modelled on the format already proven in `Sources/YouTube`:

| Field | What goes in it |
|---|---|
| `takeaways` | 5-8 specific bullets. Numbers, named frameworks, the speaker's own distinctions. Never generic advice |
| `quotes` | 4-6 **verbatim** lines. Copy exactly; use an ellipsis for interior trims |
| `bestIdeas` | 3-5 transferable ideas, each with a line on *why* it transfers |
| `tools` | Every tool, plugin, app or command named, and what it is used for |
| `method` | The how-to spine — the setup, workflow or numbered process, faithfully |
| `mindmap` | A mermaid `mindmap` body (no fences) mapping the argument |
| `keyMessage` | One sentence: the thing the speaker most wants understood |

Every field is optional and the note still renders without them, so a thin capture
degrades gracefully rather than failing.

**Check the transcript is really English before trusting it.** `fabric -y` returns
whatever caption track YouTube serves, which on a dubbed or multi-language video is a
machine TRANSLATION, not the original audio. The tell is mangled proper nouns or
non-Latin characters (2026-09-07: a Spiegel interview came back naming him "Professor
Wilson", with Cyrillic mixed in). Quotes from such a file are fabrications. When it
looks translated, pull the original track instead:

```bash
yt-dlp --list-subs <url> | grep -iE '^(en|en-orig)\s'   # is there an en-orig?
yt-dlp --skip-download --write-auto-subs --sub-langs en-orig --sub-format vtt \
  -o out.%(ext)s <url>
```

Then strip the VTT timestamps and rolling-caption duplication before reading.

**Verify quotes before writing.** Normalise case and punctuation, then substring-match
each quote against the transcript. A quote that fails the check is paraphrase — find
the real wording or drop it. (2026-09-07: an extraction agent returned a plausible
"smart PhD student" quote whose wording did not appear in the transcript.)

**Do not write the Thinking-notes section.** The renderer seeds the heading so a link
from `01 Thinking` has somewhere to land. What goes under it is Dom's own words,
written by hand — and a Reference note graduates to `Sources/` only when he writes it
up, never automatically.

**4. Reconcile tags against the vault.** Non-negotiable — this is what makes
surfacing work.

```bash
bun run ~/.claude/skills/Capture/Tools/TagVocabulary.ts --json
```

Prefer an existing vault tag over a new near-duplicate. `Capture.ts` also reconciles
automatically, but choosing well up front produces better tags than normalising bad
ones after.

**5. Find relationships.** Search existing Reference and `01 Thinking` notes sharing
2+ tags; list them as wikilinks under `## Related`.

**6. Commit.** Pipe the payload as JSON on stdin:

```bash
echo '<payload json>' | bun run ~/.claude/skills/Capture/Tools/Capture.ts json
```

This writes the note, updates the index, and regenerates the anchor if the source has
earned one. Payload shape is `NoteInput` in `Tools/Note.ts`.

**7. Report in one or two lines.** Where it landed, and the anchor if one was created
or updated. Do not narrate the steps.

## Surfacing — the actual point

When a subject comes up in ordinary work, check what Dom already saved:

```bash
bun run ~/.claude/skills/Capture/Tools/Surface.ts "<the subject at hand>"
```

- Empty output means say nothing. **Never announce "nothing found"** — a skill that
  speaks on every subject gets muted within a week.
- Maximum 3 items, already enforced.
- Do not re-surface the same item twice in one session.
- The tool exits silently while asleep; captures still work.

Surface it as a brief aside, not a section:

> You saved three things on this in August — *Steel Man Argument* (Philosophy Vibe),
> and two articles on argumentation.

## Anchors

A channel or site anchor is **earned**: created on explicit request, or when the
third item from that source arrives, at which point earlier items are retro-linked.
One saved blog post must not mint a domain stub.

Anchor child lists are **regenerated** from note frontmatter on every capture, never
appended — matching how `ARCHITECTURE_SUMMARY` and `PRINCIPAL_TELOS` are maintained.
The list is correct by construction and self-heals after hand edits. Content outside
the `<!-- capture:generated:start/end -->` fence is preserved.

## Where things live

| Path | What |
|---|---|
| `~/obsidian/Reference/YouTube/` | videos |
| `~/obsidian/Reference/Web/` | articles and snippets |
| `~/obsidian/Reference/Channels/` | channel anchors |
| `~/obsidian/Reference/Sites/` | site anchors |
| `~/obsidian/Reference/Tools/` | repos, CLIs, plugins |
| `~/.claude/LIFEOS/MEMORY/reference-index.json` | the search index |

The index is a **cache, never a source of truth**. Rebuild any time:

```bash
bun run ~/.claude/skills/Capture/Tools/Index.ts rebuild
```

## Gotchas

- **Never write to `~/obsidian/.obsidian/`.** The Mac holds authoritative app config.
- **`ai` is a real tag.** Short tokens are kept deliberately in `Surface.ts`; a
  length filter silently broke every AI-related surface once already.
- **Reference is not Sources.** `Sources/` means a processed write-up, by its own
  README. An item graduates Reference → Sources when Dom writes it up, never
  automatically.
- **Tools use the Vault Guide lifecycle** (`to-try` → `testing` → `adopted` /
  `rejected`), not `captured`.
- **A failed fetch still produces a note** with `status: unfetchable`. Losing the URL
  is worse than a thin note.
- **Don't ask which folder.** Classification is deterministic; state it and move on.

## Reference

Full spec, 10 user stories and 61 acceptance criteria:
`~/.claude/LIFEOS/MEMORY/WORK/reference-capture-skill/SPEC.md`
