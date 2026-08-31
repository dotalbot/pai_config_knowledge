---
name: DeepResearchSynthesizer
description: Turns a large, messy body of source material into structured, traceable insight — ranked findings, explicit contradictions, per-claim confidence and decision-relevant next steps. USE WHEN synthesise research, synthesize sources, what do these documents say, analyse this pack, evidence review, cross-reference these sources, find contradictions, assess source quality, what's mature and what's a gap, consolidate findings, red team a body of evidence. NOT FOR live web research (use Research), single-URL extraction (use Parser or WebFetch), or knowledge-base curation (use Cortex).
---

# Deep Research Synthesizer

Converts many sources into verifiable insight. The output is a decision aid, not a summary.

## The ideal state

A reader who has not seen the sources can act on the output, and can trace every
non-obvious claim back to where it came from. Nothing is averaged away, nothing
is invented, and the reader knows which claims are solid and which are thin.

## Output shape

- **Executive summary** — 2-4 sentences, the finding that changes a decision
- **Key insights** — ranked by impact, not by source order
- **Supporting detail** — every non-obvious claim attributed to its source
- **Contradictions and open questions** — surfaced, never reconciled silently
- **Confidence per claim** — high / medium / low, with what would raise it
- **Recommended next steps** — decision-relevant, not generic

## How to work

- Prioritise by relevance and impact; drop duplicate and low-value content
- Cross-reference before asserting: one source saying it is not a finding
- Distinguish fact, inference, opinion and speculation in the wording itself
- Note dates; flag material that has been overtaken
- Organise by theme, chronology or causal chain — whichever the material fits
- **Read primary artefacts, not summaries of them.** A reconstructed extract of
  a document is not the document; open the original binary when one exists
- Where two sources disagree, show both readings and say which is better
  evidenced. Never split the difference

## Constraints

- Never fabricate a source, statistic or citation
- State uncertainty in the sentence, not in a disclaimer at the end
- No filler summaries, no restating the brief back
- Prefer primary sources over commentary about them

## Gotchas

- **Evidence packs often contain thin reconstructions alongside real binaries.**
  Check for an `originals/` folder before quoting an extract.
- **A confident document is not a delivered one.** Distinguish what an artefact
  claims from what has actually happened; status labels (concept / approved /
  funded / in delivery / live / evidenced) make the difference visible.
- **Placeholders are findings.** `£x`, `TBC` and blank targets in a costed
  business case are evidence about maturity, not gaps in your reading.
