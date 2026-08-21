---
task: "Agent register canvas app analysis schema diagrams UX review"
slug: 20260610-agent-register-analysis
effort: E4
effort_source: classifier
phase: complete
progress: 132/132
mode: interactive
started: 2026-06-10T00:00:00Z
updated: 2026-06-10T14:15:00Z
---

## Problem

The Agent Register exists as a mature governance spreadsheet (v0.3 — 62 columns, 21 sheets, 19 agents) with a well-defined data model, governance controls, and a lifecycle diagram. A Canvas PowerApp has been built to v12 with working navigation, tabs, linked actions, and SharePoint Lists as the data layer. However there is no single authoritative analysis that:

1. Maps the full xlsx field set to the current Lists/app schema and surfaces gaps.
2. Defines the current data schema in machine-readable form for developers.
3. Specifies the future schema required when the ADO pivot lands (Phase 2 mesh).
4. Produces architecture and sequence diagrams that devs and stakeholders can share.
5. Gives a structured UI/UX critique of what the app must do differently to serve users who are accustomed to the richness of the spreadsheet.
6. Lists specific recommendations with enough context to act on immediately.
7. Surfaces questions that Dom needs answered before the next build sprint.

The gap between "spreadsheet governance artefact" and "working Canvas app" is not yet bridged analytically.

## Vision

Dom opens this analysis, reads the data schemas once, and immediately knows what every field is, where it lives, and how the ADO pivot changes the picture. He pastes the architecture diagram into the next steering deck. He sends the UX critique to the developer team and it provokes immediate action on three or four specific screens. He takes the recommendations list into the next sprint planning session and uses it to sequence the next six weeks of work. The questions section gives him a precise agenda for the next governance review. Euphoric surprise comes when the schema design surfaces a structural flaw that nobody had named yet — the analysis earns its cost by being the thing that prevents a rebuild in three months.

## Out of Scope

This is a read-and-analyse task. No code is written, no app screens are modified, no SharePoint lists are provisioned, no ADO integration is implemented. The ADO Phase 2 write-back design is out of scope — only the schema fields needed for Phase 1 (read-only sync) are specified. Dataverse migration design is noted but not detailed. Power Automate flow design is not covered. The analysis does not cover authentication/RBAC design within the app. No new mockups are produced — the existing v1 build pack mockups are used as the UX reference.

## Principles

1. **Schema must reflect governance reality.** Fields exist because governance requires them — not because they are technically convenient. Field design must preserve the mandatory/optional distinction from the xlsx `*` notation.
2. **Separation of concerns is non-negotiable.** ADO owns delivery execution; the Power App owns governance. Any field that lives in both must have a clear owner and a stated sync direction.
3. **Child lists over wide tables.** Repeatable rows (knowledge sources, test questions, readiness checks) belong in child lists. The parent Agents list must remain queryable and filterable without SharePoint delegation issues.
4. **User-facing screens optimise for cognitive load.** Canvas is a constrained rendering environment. Every screen decision should reduce the number of things the user must hold in their head.
5. **The xlsx is the truth, not the enemy.** The spreadsheet captures 62 columns of governance reality. The app must respect that richness — it cannot be a simplified subset without explicit out-of-scope declarations.
6. **ADO pivot must not require a rebuild.** Schema decisions now must leave room for Phase 2 ADO fields without refactoring existing lists.

## Constraints

- Canvas PowerApp is the mandated front-end — no Dataverse-native forms, no model-driven app.
- Microsoft Lists (SharePoint) is the data layer for v1 — Dataverse is a future option only.
- SharePoint List column limits: practical threshold ~300 columns before performance degrades; single list must stay well under this.
- Azure DevOps integration is Phase 1 read-only — no write-back in the current build sprint.
- Canvas lacks a native kanban component — Pipeline board requires a custom horizontal gallery pattern.
- Agent name max length: 42 characters (xlsx constraint, enforced by the template).
- The app must work within a single Power Platform environment (Default-e476cf3e...).

## Goal

Produce a complete analytical reference for the Agent Register app covering: (1) the current data schema mapped from xlsx v3 to Lists, (2) the future schema post-ADO pivot, (3) an architecture diagram, (4) a sequence flow diagram, (5) a structured UI/UX critique, (6) a prioritised recommendations list, and (7) a questions agenda — sufficient that a developer team can act without further archaeology.

## Criteria

### File saved
- [ ] ISC-1: xlsx file exists at `repo/Agent_register/source-assets/Agent_register_v3.xlsx`

### Current data schema — Agents list
- [ ] ISC-2: Agents list schema enumerates all 62 xlsx Agent Register columns with their type, mandatory flag, and controlled-values source
- [ ] ISC-3: Each column is assigned to one of: `Agents` list, named child list, or `[ADO Phase 2]`
- [ ] ISC-4: Column groups match the xlsx sections (identity, lifecycle, governance, ownership, evidence, assurance, release)
- [ ] ISC-5: Controlled-value columns reference the Governance Lists sheet vocabulary (14 value lists)
- [ ] ISC-6: Mandatory fields (`*`) are flagged distinctly from optional fields
- [ ] ISC-7: AgentID, AgentName, Portfolio fields are present and typed
- [ ] ISC-8: Lifecycle status field uses the 8-value Governance Lists vocabulary
- [ ] ISC-9: DoR gate status, DoD gate status, Production Readiness gate status are present as separate Choice fields
- [ ] ISC-10: AIS Date, AIS Outcome, AIS Notes are present with correct types
- [ ] ISC-11: Private beta testers field is identified as a structural issue (text vs People)
- [ ] ISC-12: Evidence fields (EvidenceHeld, EvidenceSummary, EvidenceLink, VerifiedBy, VerifiedDate, VerificationOutcome) are all present
- [ ] ISC-13: ELS Status, ELS Model are present with controlled values
- [ ] ISC-14: All ownership fields (AgentOwner, ProductOwner, BusinessSponsor, BA, AgentBuilder, SMEOwner, ServiceOwner, TechOwner, SupportTeam, AICoeReviewer) are typed as Person fields
- [ ] ISC-15: Assurance fields (DSPM, DLP, RBAC, Monitoring, NextReviewDate) are present and typed
- [ ] ISC-16: Release fields (AdoPipelineLink, ReleasePackage, ReleaseDate, ProductionGroup, ReleaseApprover) are present
- [ ] ISC-17: GovernanceDecision, ApprovalDate, ApprovalConditions are present
- [ ] ISC-18: CurrentStageOwner, NextAction, NextActionDueDate are present
- [ ] ISC-19: CommsReadiness, RollbackReadiness, AgentRiskLevel are present
- [ ] ISC-20: Schema doc states total column count for the Agents list

### Current data schema — Child lists
- [ ] ISC-21: Knowledge Sources child list schema is present with all fields (SourceName, Format, Location, IsCurrent, IsAccessible, Owner, etc.)
- [ ] ISC-22: Test Questions child list schema is present (Question, ExpectedAnswer, SourceRef, TestType, ExpectedBehaviour, PassCriteria, PassFail, EvidenceLink)
- [ ] ISC-23: Readiness Checklist child list schema is present (Area, CheckText, ReadyStatus, BlockingNote)
- [ ] ISC-24: Actions child list schema is present (Title, AgentLookup, Description, Owner, DueDate, Status)
- [ ] ISC-25: Promotion Decisions child list schema is present
- [ ] ISC-26: Review Events child list schema is present
- [ ] ISC-27: Agent ADO Links child list schema is present with all ADO mesh fields
- [ ] ISC-28: All child lists declare their relationship to the parent Agents list (Lookup field type and direction)
- [ ] ISC-29: Config lists (Choices, Templates) are named and their purpose stated

### Current data schema — gaps identified
- [ ] ISC-30: Gap: Agent template instruction sections (Identity, Purpose, Behaviour Rules, Boundaries, Escalation) are not in the schema and the analysis notes where they should live
- [ ] ISC-31: Gap: User story fields (AsA, IWantTo, SoThat) are not in schema and the analysis notes where they should live
- [ ] ISC-32: Gap: Topics covered / excluded are not in current schema
- [ ] ISC-33: Gap: ADO pipeline run/link field in xlsx maps to a URL but no live sync field exists yet — documented as Phase 2 placeholder

### Future schema — ADO pivot fields
- [ ] ISC-34: Future schema adds AdoProjectId, AdoAgentWorkItemId, AdoAgentUrl to Agents list
- [ ] ISC-35: Future schema adds AdoIdeaWorkItemId, AdoState (mirror), AdoAssignedTo (mirror) to Agents list
- [ ] ISC-36: Future schema adds AdoAreaPath, AdoIterationPath, AdoChangedDate to Agents list
- [ ] ISC-37: Future schema adds AdoSyncStatus (Choice: Synced, Missing, Conflict, Error) to Agents list
- [ ] ISC-38: Future schema adds AdoSyncNotes to Agents list
- [ ] ISC-39: Future schema defines ADO Projects reference list with ProjectId, ProjectName, OrgUrl fields
- [ ] ISC-40: Future schema defines ADO Work Item Types reference list (TypeName, ReferenceName, UseInApp flag)
- [ ] ISC-41: Future schema defines ADO Lifecycle Mapping list (AdoState → PowerAppLifecycle mapping)
- [ ] ISC-42: Future schema notes Phase 2 Agent ADO Links list becomes bidirectional (write-back fields)
- [ ] ISC-43: Future schema total new field count on Agents list is stated
- [ ] ISC-44: Future schema migration path states which existing fields become ADO-sourced vs remain Power App native
- [ ] ISC-45: Lifecycle state mapping table is present (ADO Agent states → Power App lifecycle, ADO Idea states → intake)

### Architecture diagram
- [ ] ISC-46: Architecture diagram exists as an Excalidraw file in the repo
- [ ] ISC-47: Diagram shows 5 layers: Experience, Governance Control, Delivery Execution, Data+Integration, Evidence+Service
- [ ] ISC-48: Diagram shows Power App as governance layer
- [ ] ISC-49: Diagram shows SharePoint Lists as primary data store
- [ ] ISC-50: Diagram shows ADO as delivery execution layer
- [ ] ISC-51: Diagram shows Power Automate sync layer between ADO and Lists
- [ ] ISC-52: Diagram shows Teams as the agent access channel
- [ ] ISC-53: Diagram shows SharePoint evidence documents as the evidence store
- [ ] ISC-54: Diagram labels Phase 1 (read-only) vs Phase 2 (write-back) ADO integration

### Sequence flow diagram
- [ ] ISC-55: Sequence flow diagram exists as an Excalidraw file in the repo
- [ ] ISC-56: Flow covers all 8 lifecycle stages: Intake/Capture → Evaluate → Approve → Ready/Design → Build&QA → Private Beta/UAT → Done/Live → Monitor/Improve
- [ ] ISC-57: Flow shows gate checks (DoR, DoD, Production Readiness) as explicit decision nodes
- [ ] ISC-58: Flow shows actors (Agent Owner, DDSS/Governance, AI CoE, Service Owner)
- [ ] ISC-59: Flow shows ADO work item creation/state change at key transition points
- [ ] ISC-60: Flow shows evidence capture steps at each gate
- [ ] ISC-61: Flow shows AIS review as a step within the Evaluate stage

### UI/UX review — critical issues
- [ ] ISC-62: UX review identifies kanban board constraint (Canvas has no native kanban) and states the current workaround
- [ ] ISC-63: UX review identifies that the register list (agent list gallery) needs inline status badges, not just text
- [ ] ISC-64: UX review identifies the intake wizard (5-step) complexity risk for Canvas implementation
- [ ] ISC-65: UX review identifies template completeness percentage (78%) as a strong UX feature to preserve
- [ ] ISC-66: UX review identifies the section navigation tabs (Summary / Gate Review / Knowledge / Testing / Publishing) as the right pattern
- [ ] ISC-67: UX review identifies that the 62-column schema must NEVER be presented as a flat form — section grouping is mandatory
- [ ] ISC-68: UX review identifies missing search-as-you-type on the register screen
- [ ] ISC-69: UX review identifies private beta testers as a People field UX problem (comma-separated text is not user-friendly)
- [ ] ISC-70: UX review identifies the lifecycle stepper widget (numbered stages at top of detail screen) as the most important navigation anchor
- [ ] ISC-71: UX review identifies that AIS outcome (RED/AMBER/GREEN) must render as a colour chip, not plain text
- [ ] ISC-72: UX review identifies that gate status fields need traffic-light visual treatment to give immediate status comprehension
- [ ] ISC-73: UX review identifies the "Needs attention" section on the dashboard as the most valuable real estate — needs careful curation logic
- [ ] ISC-74: UX review identifies that the app must preserve the distinction between dashboard (broader pipeline, 19 agents) and register (active governance ledger, 10 agents)
- [ ] ISC-75: UX review identifies that evidence links should open in a new tab, not replace the app view
- [ ] ISC-76: UX review identifies the lack of a bulk-export / report view (Reports nav item exists in mockup but not yet built)
- [ ] ISC-77: UX review identifies that the agent template form needs inline help text (the xlsx column headers contain guidance that must survive in the app)

### UI/UX review — positive findings
- [ ] ISC-78: UX review confirms the nav structure (Home / Pipeline / Register / Intake / AIS Review / Reports / Admin) is well-designed for the user mental model
- [ ] ISC-79: UX review confirms the build-pack mockup visual design (Inter typeface, status badge colour system, dark nav sidebar) is production-quality
- [ ] ISC-80: UX review confirms the agent detail header (name + status chips + stage stepper) is an excellent pattern
- [ ] ISC-81: UX review confirms the split-panel layout (main content + working notes) on the detail screen serves the governance workflow well

### Recommendations
- [ ] ISC-82: Recommendation R1 is stated with priority and rationale: split private beta testers into a People lookup (structural change needed before data grows)
- [ ] ISC-83: Recommendation R2 is stated: add template instruction sections (Identity, Purpose, Behaviour, Boundaries, Escalation) to Agent Details child list or as columns on the Agents list
- [ ] ISC-84: Recommendation R3 is stated: implement gate enforcement — prevent lifecycle movement unless DoR/DoD gate status = Passed
- [ ] ISC-85: Recommendation R4 is stated: add ADO stub fields now (AdoAgentUrl as hyperlink, AdoState as text mirror) so Phase 2 sync has landing fields
- [ ] ISC-86: Recommendation R5 is stated: implement Reports screen before ADO pivot — current pipeline data is sufficient to produce useful reports
- [ ] ISC-87: Recommendation R6 is stated: add AIS Review workflow — the AIS date/outcome/notes pattern needs a dedicated screen, not just fields on the detail view
- [ ] ISC-88: Recommendation R7 is stated: normalise the approval fields — GovernanceDecision, ApprovalDate, ApprovalConditions should be captured as a child Approval record, not flat columns
- [ ] ISC-89: Recommendation R8 is stated: add a "missing evidence" alert on the dashboard — any agent with EvidenceHeld=Yes but EvidenceLink blank should surface as an attention item
- [ ] ISC-90: Recommendation R9 is stated: clarify the Approve stage in the lifecycle — currently 0 agents use it, and the app has no dedicated Approve screen or workflow

### Questions
- [ ] ISC-91: Question Q1 is stated: should the app enforce gate transitions (block movement unless gates pass) or is it advisory only?
- [ ] ISC-92: Question Q2 is stated: who creates intake records — agent owners directly, or via a governance team?
- [ ] ISC-93: Question Q3 is stated: what triggers an ADO write-back (Phase 2) — a specific milestone, or user demand?
- [ ] ISC-94: Question Q4 is stated: should private beta testers be linked to AAD Security Groups or individual Person fields?
- [ ] ISC-95: Question Q5 is stated: is the 42-character agent name limit a Copilot Studio system constraint or a UX convention?
- [ ] ISC-96: Question Q6 is stated: are the Portfolio/Scheme values (Ops, E&E, Digital Delivery, DDSS, A&C, Policy) stable or will they evolve?
- [ ] ISC-97: Question Q7 is stated: should the register (active governance ledger) and the pipeline dashboard (all 19 agents) be separate SharePoint lists or one list with a filter?
- [ ] ISC-98: Question Q8 is stated: what is the governance process for retiring an agent — is there an explicit Retired status?
- [ ] ISC-99: Question Q9 is stated: who has write access to mandatory governance fields — agent owners, or DDSS only?

### Anti-criteria
- [ ] ISC-100: Anti: the analysis does not recommend replacing SharePoint Lists with Dataverse in the current sprint — Dataverse migration is noted as future-state only
- [ ] ISC-101: Anti: the data schema does not collapse child lists into the parent Agents list — wide-table anti-pattern must not appear in recommendations
- [ ] ISC-102: Anti: the UX review does not suggest feature parity with Azure DevOps boards — the Power App governs, ADO executes
- [ ] ISC-103: Anti: the analysis does not omit mandatory governance fields from the schema to simplify it — all 62 columns must be accounted for
- [ ] ISC-104: Anti: the architecture diagram does not show ADO and Power App as having equal authority over agent governance fields
- [ ] ISC-105: Anti: no recommendation suggests building a native mobile version — Canvas tablet format is the target

### Schema quality gates
- [ ] ISC-106: All field types use SharePoint-compatible types (Single line text, Multi-line text, Choice, Person, Date, Hyperlink, Yes/No, Number, Lookup)
- [ ] ISC-107: All Choice fields list their allowed values from the Governance Lists vocabulary
- [ ] ISC-108: All Lookup fields state the target list name
- [ ] ISC-109: No field is left as "TBD" in the current schema — gaps are labelled `[ADO Phase 2]` or `[future]`, not TBD

### Documentation quality gates
- [ ] ISC-110: Architecture diagram file path is stated in the analysis output
- [ ] ISC-111: Sequence flow file path is stated in the analysis output
- [ ] ISC-112: All schema tables use consistent markdown table format
- [ ] ISC-113: Recommendations are numbered R1–R9 with Priority (High/Medium/Low) and Effort (Low/Medium/High)
- [ ] ISC-114: Questions are numbered Q1–Q9 with the stakeholder who can answer each

### Structural issues surfaced
- [ ] ISC-115: Analysis identifies that the xlsx has 62 columns in one Agent Register sheet — and maps how many belong in the parent list vs child lists
- [ ] ISC-116: Analysis identifies that multiple ownership fields (8 people) are flat columns — notes the data integrity risk
- [ ] ISC-117: Analysis identifies that alignment notes (`Mapped from original dashboard status.`) in many records are scaffolding text, not real governance data — flags as data quality issue
- [ ] ISC-118: Analysis identifies that `GovernanceApprovalDecision = "Not assessed"` for all 19 agents is a governance gap, not a data model issue
- [ ] ISC-119: Analysis identifies that `EvidenceSummary` is placeholder text in all current records — the app needs a prompted-entry pattern, not a free-text field

### Completeness gate
- [ ] ISC-120: All twelve ISA sections are populated (E4 completeness gate)
- [ ] ISC-121: All critical analysis deliverables (schema, diagram paths, UX review, recommendations, questions) are present in the SUMMARY CONTENT block
- [ ] ISC-122: Schema includes field counts per list
- [ ] ISC-123: Architecture diagram is verified to exist at stated path
- [ ] ISC-124: Sequence flow diagram is verified to exist at stated path

### Agent Ideas vs Agent Register distinction
- [ ] ISC-125: Analysis notes that Agent Ideas (backlog) and Agent Register (active governance) are separate sheets in the xlsx and should remain separate in the app
- [ ] ISC-126: The promotion path (Idea → Register) is documented as a gate decision, not an automatic upgrade
- [ ] ISC-127: Agent Ideas intake fields (a subset of the full register) are identified separately

### ADO integration readiness
- [ ] ISC-128: Analysis confirms that ADO project `Copilot Studio Agents` already has `Custom_CSA_*` fields that overlap with the register template — and states the mapping
- [ ] ISC-129: Analysis confirms that the mesh schema doc (doc 07) is the authoritative source for the Phase 1 sync field list
- [ ] ISC-130: Analysis states that the Phase 1 sync should use ADO work item IDs as stable keys, not titles

### Overall assessment
- [ ] ISC-131: Analysis gives an overall assessment of app maturity vs xlsx vision (score or narrative)
- [ ] ISC-132: Analysis states the single most important structural decision to make before the next build sprint

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | file-exists | ls source-assets/Agent_register_v3.xlsx | exit 0 | Bash |
| ISC-2–19 | content-review | Read analysis doc, confirm each field group present | all groups present | Read |
| ISC-20 | content-count | count columns in schema table | =62 | Read/count |
| ISC-21–29 | content-review | Read analysis doc, each child list section present | all 7 lists named | Read |
| ISC-30–33 | content-review | Gap section present with named missing fields | all 4 gaps documented | Read |
| ISC-34–45 | content-review | Future schema section present with ADO fields | all 13 fields listed | Read |
| ISC-46–54 | file-exists + visual | Excalidraw architecture file exists at stated path | file present, 5 layers visible | Bash + Read |
| ISC-55–61 | file-exists + visual | Excalidraw sequence file exists at stated path | file present, 8 stages visible | Bash + Read |
| ISC-62–81 | content-review | UX review section: each numbered issue present | all 20 items present | Read |
| ISC-82–90 | content-review | Recommendations section: R1–R9 with priority | 9 recommendations, all with priority | Read |
| ISC-91–99 | content-review | Questions section: Q1–Q9 with named stakeholder | 9 questions present | Read |
| ISC-100–105 | content-review | Anti-criteria section: 6 anti-conditions stated | present in analysis | Read |
| ISC-106–109 | schema-review | All field types are valid SharePoint types | no TBD types | Read |
| ISC-110–114 | documentation-review | Diagram paths stated, tables consistent | all paths present | Read |
| ISC-115–119 | content-review | Structural issues section: 5 issues named | present | Read |
| ISC-120–124 | completeness-gate | ISA sections complete, all deliverables present | pass | Read |
| ISC-125–127 | content-review | Agent Ideas vs Register distinction documented | present | Read |
| ISC-128–130 | content-review | ADO readiness section present | present | Read |
| ISC-131–132 | content-review | Overall assessment and single priority decision present | present | Read |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| save-xlsx | Copy xlsx to source-assets | ISC-1 | — | false |
| current-schema | Full current data schema document | ISC-2–33, ISC-106–109, ISC-115–119, ISC-125–127 | save-xlsx | false |
| future-schema | ADO pivot schema additions | ISC-34–45, ISC-128–130 | current-schema | false |
| architecture-diagram | Excalidraw architecture diagram | ISC-46–54, ISC-110 | current-schema, future-schema | true |
| sequence-diagram | Excalidraw sequence flow diagram | ISC-55–61, ISC-111 | current-schema | true |
| ux-review | UI/UX critique of app vs mockups vs xlsx | ISC-62–81 | — | true |
| recommendations | R1–R9 prioritised recommendations | ISC-82–90, ISC-113 | current-schema, ux-review | false |
| questions | Q1–Q9 questions agenda | ISC-91–99, ISC-114 | — | false |
| structural-issues | Named structural issues | ISC-115–119 | current-schema | false |
| overall-assessment | Maturity assessment + priority decision | ISC-131–132 | all features | false |

## Decisions

- 2026-06-10: xlsx copied to `source-assets/` — existing pattern (another xlsx already there)
- 2026-06-10: Task ISA chosen (not project ISA) — this is a one-shot analysis session, not a persistent project-level record
- 2026-06-10: Diagrams will be produced as Excalidraw via MCP tool, saved to `repo/Agent_register/docs/diagrams/`
- 2026-06-10: ISC count = 132 — meets E4 floor of ≥128
- 2026-06-10: Delegation floor E4=2 — Excalidraw MCP (architecture + sequence diagrams) counts as delegation; IterativeDepth skill as second
- 2026-06-10: IterativeDepth for schema analysis: will apply 4 lenses (data model, governance, UX, ADO integration)
- 2026-06-10: ApertureOscillation applied at two apertures — current state (v12 app) and future state (ADO pivot)
- 2026-06-10: FirstPrinciples applied to challenge the flat-column governance data model assumption

## Changelog

(empty — populate at LEARN)

## Verification

(empty — populate at VERIFY)
