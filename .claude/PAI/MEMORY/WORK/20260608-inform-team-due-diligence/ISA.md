---
task: "Due diligence on The Inform Team — job offer assessment"
slug: "20260608-inform-team-due-diligence"
effort: E5
phase: complete
progress: 100
mode: algorithm
started: "2026-06-08T00:00:00Z"
updated: "2026-06-08T00:00:00Z"
---

## Problem

Dom has an initial job offer from The Inform Team. He knows Erica Jefferies (ex-PwC, Programme Manager) works there. He has no structured picture of the company — financials, culture, leadership, technology focus, growth trajectory, or whether it actually fits his profile.

## Vision

A complete, candid portrait of The Inform Team that surfaces things Dom wouldn't have found in 5 minutes — including at least one thing that meaningfully changes how he evaluates the offer.

## Out of Scope

Personal details about individual employees beyond what's relevant to culture/leadership signals. Anything requiring authentication bypass or private databases.

## Constraints

Public data only. UK company registers, LinkedIn, Companies House, press, job postings, Glassdoor/Indeed reviews, their website, and web research.

## Goal

Synthesise parallel research from multiple agents into a single structured assessment covering: company identity, financials, leadership, technology focus, culture signals, market position, and fit for a senior EA/AI practitioner with Dom's profile.

## Criteria

- [ ] ISC-1: Company registered name and Companies House number confirmed
- [ ] ISC-2: Revenue range or financial indicators found
- [ ] ISC-3: Headcount / team size established
- [ ] ISC-4: Leadership team named (≥2 named people)
- [ ] ISC-5: Core product/service described in concrete terms (not marketing copy)
- [ ] ISC-6: Technology stack or methodology signals found
- [ ] ISC-7: Client/sector focus identified
- [ ] ISC-8: Growth trajectory indicators found (recent hires, funding, news)
- [ ] ISC-9: Culture signals found (Glassdoor, LinkedIn tone, job ads language)
- [ ] ISC-10: At least one "surprise" finding — something non-obvious
- [ ] ISC-11: Fit assessment against Dom's profile (EA, AI, hands-on, 30yr exp)
- [ ] ISC-12: Anti: assessment not based solely on their own marketing copy

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | functional | Companies House lookup | name + number | Web research |
| ISC-2 | functional | financial data or Companies House accounts | any figure | Web research |
| ISC-3 | functional | LinkedIn employee count or press | number | Web research |
| ISC-4 | functional | named leadership from website/LinkedIn | ≥2 | Web research |
| ISC-5 | functional | product/service described concretely | present | Web research |
| ISC-6 | functional | tech/methodology signals | present | Web research |
| ISC-7 | functional | client/sector identified | present | Web research |
| ISC-8 | functional | growth indicators | present | Web research |
| ISC-9 | functional | culture signals from 3rd party sources | present | Web research |
| ISC-10 | functional | non-obvious finding | present | synthesis |
| ISC-11 | functional | fit narrative against Dom's profile | present | synthesis |
| ISC-12 | anti | sources not limited to their own site | ≥3 external | verification |

## Features

| name | description | satisfies | parallelizable |
|------|-------------|-----------|----------------|
| Companies House | UK register lookup — legal name, incorporation, accounts | ISC-1, ISC-2 | true |
| Website deep-read | Products, services, clients, vision, leadership | ISC-4, ISC-5, ISC-7 | true |
| LinkedIn profile | Headcount, recent hires, employee profiles | ISC-3, ISC-8, ISC-9 | true |
| Press and news | Recent coverage, contracts, awards | ISC-8, ISC-10 | true |
| Job postings | Tech signals, growth signals, culture language | ISC-6, ISC-8, ISC-9 | true |
| Glassdoor/reviews | Employee sentiment | ISC-9 | true |
| Synthesis | Fit assessment, surprise findings | ISC-10, ISC-11 | false |

## Decisions

2026-06-08 — Parallel research launch: 4 agents across different data surfaces to maximise coverage and avoid single-source bias.
