---
name: remy-fannader-caminao
description: "Remy Fannader — French EA theorist, author of caminao.blog and Enterprise Architecture Fundamentals. Creator of the Caminao framework: a formal, ecumenical EA ontology built on the symbolic/actual distinction."
metadata:
  type: reference
  domain: enterprise-architecture
  tags: [ea, ontology, conceptual-modeling, knowledge-architecture]
  source: https://caminao.blog/
  analyzed: 2026-06-08
  obsidian_note: "02 Cards/Concepts/Remy Fannader — Caminao Framework.md"
---

# Remy Fannader — Caminao Framework

**Author:** Remy Fannader
**Blog:** https://caminao.blog/ — "Do systems know how symbolic they are?"
**Books:** Published in French (Eyrolles); English: *Enterprise Architecture Fundamentals* (the Pagoda Blueprint)
**Model:** Free, no ads, no consulting, no product — pure academic knowledge sharing since ~2010
**LinkedIn:** Remy Fannader (confirmed in blog comments)

---

## Core Thesis

Enterprise architecture needs a formal, **ecumenical substrate** — one that distinguishes actual from symbolic, provides a closed set of 8 primitives from which everything is derivable, and makes no assumptions about which methodology you use. The result: a framework that's compatible with Zachman, MDA, UML, OWL, object-oriented design, and goal-driven requirements — because it's a foundation, not a method.

---

## Core Mental Models

### 1. The Symbolic/Actual Distinction
Everything in EA is either **actual** (identifiable in reality: physical objects, events, people) or **symbolic** (managed representations: contracts, categories, models, organizations). Classical ontologies assume reality is physical — this creates a "blind spot" where symbolic entities get defined circularly. Caminao fixes this by treating symbolic extensions as a genuine ontological category.

**Why it matters:** Muddling symbolic and actual produces circular definitions, unwarranted complexity, and models that eat themselves. Most EA frameworks do this constantly.

### 2. Ontological Prisms (Not Pyramids)
Replace the data→information→knowledge pyramid with a **prism**. A prism diffracts light reversibly. An ontological prism lets you move between:
- **Facts** (data — identified instances in environments)
- **Categories** (information — shared symbolic representations in systems)
- **Concepts** (knowledge — pure symbolic entities)
...in either direction. This is the architectural basis for EA digital twins.

### 3. The Pagoda Blueprint
A 3-level EA map (enterprise/conceptual, logical/functional, technical/operational) crossed with 5 capabilities (Who/What/How/Where/When) = 15 cells, each with a formally-defined meaning. Aligns with Zachman, MDA (CIM/PIM/PSM), and traditional conceptual/logical/physical levels. Not a replacement — a principled alignment.

### 4. The Brain of the Firm (Updated)
Stafford Beer's 1970s cybernetics concept, updated with 2020s architecture:
- **Ontologies** → consistent symbolic representation of the enterprise
- **Machine learning** → osmosis (data mining + process mining update symbolic representations from real-time data)
- **Knowledge graphs** → homeostasis (pair decision-making with symbolic resources; explainability of decisions)
= An enterprise that can reason about its own decisions, not just execute them.

### 5. Rationality vs Accountability (The AI Limit)
Machines can have **rationality** (goals driven by rules/logic). Decision-making **accountability** is exclusively human (organizations and people). Collective decision-making can only be supported by explicit knowledge. This is a principled limit on AI governance authority — not a capability argument, but a structural one.

### 6. Ecumenical Commitment (No Best Practices Built In)
The framework deliberately carries no methodology assumptions. It's a substrate that can support any method: agile, MBSE, model-driven, pattern-driven. This isn't modesty — it's a design requirement. A formal framework that assumes a methodology stops being a foundation.

### 7. Knowledge Galaxies Metaphor
Stars = concepts, planets = categories, satellites = facts, gravity = semantic bonds. Star systems = abstraction levels within perspectives. Orbits = abstraction levels between perspectives. The metaphor earns its keep: different semantic relationships (subset, type, realization) have different rules, and the metaphor maps cleanly to them.

### 8. Hard Goals vs Soft Goals (EA Application)
From i*/Tropos: hard goals (explicit, plannable, monitorable) → business cases (enterprise objectives, method-agnostic). Soft goals (supporting rationales) → use cases (objectives with specific processes) and system cases (direct system contributions). Most modeling languages ignore intentions entirely. EA frameworks that do this fail at governance.

---

## Frameworks Referenced

- **UFO (Unified Foundation Ontology)** — Guizzardi et al — the blind spot Caminao addresses
- **i*/Tropos** — goal-driven requirements; hard/soft goals distinction adopted into Caminao
- **Zachman Framework** — the EA taxonomy the Pagoda Blueprint aligns with
- **OMG MDA (CIM/PIM/PSM)** — model-driven architecture levels
- **Stafford Beer, Brain of the Firm** — cybernetics source updated for modern EA
- **OWL/Protégé** — implementation environment for the Caminao ontological kernel
- **UML#** — Remy's subset of UML for requirements and analysis (not design)
- **OODA (Boyd)** — used for business and engineering decision-making processes

---

## Spicy Positions

- Methodologies that bake in "best practices" are frameworks masquerading as foundations. They contaminate the conceptual layer.
- The current ontology landscape is "a mix of hedged gardens and interlaced jungles" — most proprietary ontologies have floors and stairs "at odds," making interoperability a muddy maze.
- Decision-making accountability is a hard limit on AI authority — not because AI can't be rational, but because accountability requires an agent who can be held responsible.
- "Do systems know how symbolic they are?" — the tagline is a research question. Most systems don't.

---

## Obsidian Note

Full extraction with 9 dynamic sections, themes, and references:
→ `02 Cards/Concepts/Remy Fannader — Caminao Framework.md`

---

## Cross-Links

[[daniel-miessler]] — another knowledge-sharing practitioner running a long-form free blog
