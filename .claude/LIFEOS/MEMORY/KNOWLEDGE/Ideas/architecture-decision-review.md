---
id: kb_94b4b9c68650
type: idea
title: "Architecture Decision Review — Dom's TDA practice, loosened for Inform scale"
tags: [architecture, governance, tda, decision-record, framework, dom-original]
status: evergreen
quality: 8
confidence: 0.9
source_kind: internal
source_session: 34561945-e99b-4457-a017-cfa156c4921b
created: 2026-08-22
updated: 2026-08-22
convention: kb-v3
related:
  - slug: four-ps-adoption-framing
    type: related
---

# Architecture Decision Review — Dom's TDA practice, loosened for Inform scale

**This is Dom's own framework**, distilled from Technical Design Authority practice
he ran at a large regulated client and adapted for The Inform Team. Confirmed as
his on 2026-08-22.

## Use it when

A decision has consequences beyond the immediate task: it sets a pattern others
will follow, touches identity or data boundaries, or would be expensive to
reverse. Not for reversible, contained choices — those get built.

## The two failure modes — check these FIRST

These are the reasons submissions actually get sent back. Dom named them from
experience, and they are the part that cannot be inferred from a good example.

**Scope creep.** The decision quietly grows past what was asked. Symptoms: the
"in scope" list acquires items during drafting; "while we're here" appears in the
reasoning; a second decision hides inside the first.

*Counter:* write "out of scope" BEFORE "in scope". The explicit exclusion is the
control. **If out-of-scope is empty, the scope has not been thought about.**

**Missing evidence of security sign-off.** The design is sound but nothing shows
security actually reviewed it. An assertion that it is secure is not evidence.

*Counter:* name who reviewed it, when, and what they saw. If review has not
happened, mark the decision blocked rather than presenting it as ready.

## The structure

Decision (one sentence) · Background (relate to prior decisions by reference) ·
Problem statement · **Scope, in AND out** · Options · Recommendation · Architecture
(draw the identity flow) · **Per-component: approved use AND limitations, paired** ·
Risks with owners · Action items · Decision requested.

## Why the ceremony was dropped

Formal TDA — standing board, chair, CTO sign-off, numbered submissions — earns its
overhead where a wrong pattern propagates across hundreds of users and a regulator
may ask why. The Inform Team is smaller; the same ceremony would slow decisions
that should take an afternoon.

**What survives is the thinking, not the paperwork.** The test is not "did we
follow the process" but *"could someone six months from now understand why, and
could they have objected at the time."*

Second use: it demonstrates to clients what good governance looks like. Many want
to roll out Copilot and agents without the groundwork; showing the shape of a
proper decision record is itself the advice.

## Where it lives

Full framework: `02 Doing/Frameworks/Architecture Decision Review.md` in the
Obsidian vault. Worked example: `02 Doing/Examples/Good/TDA370 — architecture
decision.md`.
