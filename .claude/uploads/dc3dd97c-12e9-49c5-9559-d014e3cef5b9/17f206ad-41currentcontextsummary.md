# 41 - Current Context Summary

Date: 2026-06-05

Status: Current handover summary

## Executive Summary

The Agent Register is now a working Power Apps / SharePoint prototype for the Agent Delivery Hub.

The current product direction is:

```text
Power App orchestrates delivery, lifecycle visibility, readiness capture and governance movement.
Azure DevOps remains the development, issue, bug and user-story system.
SharePoint Lists store the register, readiness, evidence and action data.
Power Automate is expected to become the integration/sync layer later.
```

The latest tested package is:

```text
powerapp/generated/agentregistertest_v44_secondary_screens.msapp
```

The latest committed source folder is:

```text
powerapp/source/Agent_register_v44
```

Generated `.msapp` packages are intentionally ignored by git. The source-code representation is committed.

## Git And Hindsight Status

Git status before this summary was created:

```text
Branch: main
Commit: 7ae8d8e
Tracking: main...origin/main
Working tree: clean
```

Hindsight status:

```text
Bank: Agent_buider
Status: reachable
Latest relevant memory found: v44 secondary screen consistency pass
```

Hindsight contains retained memories for the recent v42, v43 and v44 fixes.

## Current Build Position

The app has moved from provisioning and baseline analysis into a usable prototype.

Completed foundation:

- SharePoint Lists were provisioned through Graph after PnP/REST access was blocked by selected-site permissions.
- SharePoint validation passed for the core lists and columns.
- Sample data was seeded, including a sample agent, readiness checks, actions, knowledge source and ADO placeholder.
- Azure DevOps access was tested against the Inform Team / DevOps Playground setup.
- Hindsight is being used for cross-session memory under `Agent_buider`.

Completed Power App capability:

- Home dashboard / register view.
- Agent detail screen with tabs.
- Intake screen for new agent capture.
- Pipeline lifecycle board.
- Readiness checklist status updates.
- Evidence requirement for passed checks.
- Knowledge source creation with required source location and evidence summary.
- Test question capture and test result evidence.
- Action creation and action status management.
- Contextual Back navigation from Agent Detail.
- Clickable evidence, knowledge and ADO placeholder links where data exists.
- AIS Review, Reports and Admin secondary screens repaired into the same full-width shell.

## Recent Version History

| Version | Package | Main change |
| --- | --- | --- |
| v41 | `agentregistertest_v41_use_full_width_dashboard.msapp` | Rebased from user layout and fixed dashboard width. |
| v42 | `agentregistertest_v42_full_width_core_screens.msapp` | Fixed Pipeline and Agent Detail full-width layout. |
| v43 | `agentregistertest_v43_intake_full_width_fix.msapp` | Fixed Intake form layout and nav collision. |
| v44 | `agentregistertest_v44_secondary_screens.msapp` | Fixed AIS Review, Reports and Admin secondary screens. |

Each of v42, v43 and v44 passed PAC pack/unpack validation with:

```text
duplicate_count=0
colon_trap_count=0
```

## Current Design Decisions

Key product decisions now in force:

- The Power App is the delivery orchestration surface.
- Azure DevOps is deliberately not the centre of the app yet.
- ADO should appear as a linked development evidence/trigger layer later.
- Users need a clear view of where an agent is in the lifecycle.
- The app must guide capture from Intake through DoR, DoD, Production Readiness, UAT and Live.
- Passing a readiness check must require evidence.
- The app uses an Ofgem/model-driven visual direction: light left nav, Ofgem orange branding, purple command/action styling, dense operational layout.
- Current layout target follows the user-set browser canvas from `Agent_register_layout.msapp`, with full-width formulas based on available `Parent.Width`.

## Current Screens

| Screen | State |
| --- | --- |
| Home / Dashboard | Working full-width register and open actions view. |
| Pipeline | Working lifecycle lanes with proportional columns. |
| Register / Agent Detail | Working detail workspace with tabs and contextual Back. |
| Intake | Working two-column capture form, creates draft Intake agent. |
| AIS Review | Full-width publication readiness metrics and queue. |
| Reports | Full-width operational metrics and readiness exceptions. |
| Admin | Basic list health and configuration notes. |

## Data Model In Use

Primary SharePoint Lists:

- `Agents`
- `Readiness Checklist`
- `Knowledge Sources`
- `Actions`
- `Test Questions`
- `Agent ADO Links`
- `Promotion Decisions`
- `Review Events`
- `Change Log`
- `Sync Audit`
- `Agent Evidence`
- `Config - Choices`
- `Config - Templates`

Important agent fields now used by the app include:

- `Agent number`
- `Business function`
- `Target audience`
- `Problem solved`
- `Lifecycle status`
- `DoR gate status`
- `DoD gate status`
- `Production readiness gate status`
- `Evidence summary`
- `Evidence link`
- `ADO sync status`
- `User story`
- `Agent instructions`
- `Topics covered`
- `Out-of-scope topics`
- `Acceptance criteria`
- `Build notes`
- `Release notes`

## Known Constraints

- Generated `.msapp` files are local artifacts and ignored by git.
- Power Apps source YAML is fragile; every generated package should be PAC packed and unpacked before handing it to the user.
- Single-line YAML formula text containing unquoted colons can cause Power Apps import failures.
- Layout constants from older generated packages can silently leave screens narrow or overlapping.
- Hindsight retain payloads should use `items[].content` and `tags` as plain strings.

## Recommended Next Step

Next recommended build:

```text
v45 - Lifecycle movement rules
```

Purpose:

Turn the current register from a readable delivery workspace into an active delivery orchestrator.

Recommended v45 scope:

- Add clear lifecycle movement controls on Agent Detail.
- Block movement unless the relevant gate is satisfied.
- Show plain-language blocked messages.
- Patch lifecycle status when movement is allowed.
- Refresh Home, Pipeline, Reports and AIS Review after movement.
- Add or prepare movement audit notes.

Suggested rules:

| Current lifecycle | Next lifecycle | Required gate |
| --- | --- | --- |
| Intake / Capture | Ready / Design | DoR passed |
| Ready / Design | Build & QA | DoR passed |
| Build & QA | Private Beta / UAT | DoD passed |
| Private Beta / UAT | Live / Monitor | Production readiness passed |

ADO should remain a placeholder in v45 unless the delivery movement rules prove stable.
