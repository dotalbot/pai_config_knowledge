---
task: "Research OpenCode status and multi-model PAI integration"
slug: 20260607-133122_opencode-multi-model-research
effort: advanced
effort_source: classifier
phase: complete
progress: 18/18
mode: interactive
started: 2026-06-07T13:31:22Z
updated: 2026-06-07T17:00:00Z
---

## Problem

PAI is built on Claude Code and is locked to Anthropic models exclusively. Dom has a Hermes instance (a local/hosted agent) that has access to ChatGPT and other models. The constraint: certain tasks (cost-sensitive inference, GPT-4o strengths, specialist model routing) would benefit from model diversity. Separately, OpenCode — an open-source terminal coding assistant that supports multiple models — was referenced in PAI session history and its current development state is unknown. Two intertwined questions: (1) what is OpenCode now, and (2) is there a viable multi-model path for PAI via Hermes or similar?

## Vision

Dom understands clearly where OpenCode stands today — is it mature enough to be a real alternative or complement to Claude Code? He also has a concrete, low-ceremony mechanism for routing specific PAI workloads through non-Anthropic models via Hermes — one that doesn't require replacing Claude Code, doesn't add ops burden, and can be wired up in an afternoon if the approach is right. The result: PAI becomes model-fleet-aware without losing what makes it work.

## Out of Scope

Replacing Claude Code as the primary PAI runtime is not in scope — the goal is complementarity, not migration. Building a custom model router or proxy from scratch is not in scope when existing tools (Hermes, OpenRouter, LiteLLM) already solve the problem. Multi-user or SaaS model-routing is not in scope — this is single-author PAI. Evaluating every available model is not in scope — focus on what Dom already has access to via Hermes.

## Constraints

- PAI's Inference.ts is the designated inference surface — any new model access should route through or alongside it, not bypass it.
- OAuth billing for Dom's Anthropic subscription must not be used for external model calls — API key routing applies to non-Anthropic paths.
- No Python — TypeScript only per PAI operational rules.
- Hermes is the integration anchor; solution must work with what Hermes exposes (webhook, REST API, or OpenAI-compatible endpoint).
- The integration must be opt-in per task, not a global default — Claude remains primary.

## Goal

Determine OpenCode's current maturity and feature set. Identify the simplest viable mechanism for PAI to dispatch specific workloads to non-Anthropic models via Hermes, leveraging its existing model access. Produce a concrete recommendation with implementation path — not a vague "consider this" but an actual decision with next steps.

## Criteria

- [ ] ISC-1: OpenCode's current version, maintenance status, and last release date are verified from its GitHub repository
- [ ] ISC-2: OpenCode's model support list is documented — which models/providers it supports natively
- [ ] ISC-3: OpenCode's Claude Code parity status is assessed — what it can/cannot do vs Claude Code
- [ ] ISC-4: OpenCode's MCP support status is verified (PAI relies heavily on MCP)
- [ ] ISC-5: OpenCode's hooks/lifecycle support is verified (PAI relies on hooks for algorithm enforcement)
- [ ] ISC-6: OpenCode's memory/skill system compatibility with PAI is assessed
- [ ] ISC-7: Hermes's API surface is identified — does it expose OpenAI-compatible endpoint, webhook, or custom REST?
- [ ] ISC-8: Hermes's model list is confirmed — which models it provides access to
- [ ] ISC-9: Inference.ts's current model support is verified — what non-Anthropic models it already handles
- [ ] ISC-10: The OpenAI-compatible endpoint pattern is assessed — can Inference.ts call Hermes as a drop-in provider?
- [ ] ISC-11: A concrete integration approach is identified and ranked by implementation cost vs capability gain
- [ ] ISC-12: The recommended approach has a specific implementation path (file, function, change required)
- [ ] ISC-13: The webhook approach is assessed — is it simpler or more complex than direct API routing?
- [ ] ISC-14: Security implications of routing PAI workloads through Hermes are identified
- [ ] ISC-15: The "when to use which model" routing logic is defined — what criteria trigger non-Anthropic dispatch?
- [ ] ISC-16: Anti: The integration does not route Dom's Anthropic OAuth subscription to non-Dom users
- [ ] ISC-17: Anti: The integration does not break existing Claude Code + PAI hook pipeline
- [ ] ISC-18: Anti: OpenCode is not recommended as a Claude Code replacement unless it genuinely matches PAI's feature requirements

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | research | GitHub releases page for OpenCode | Version + date present | WebSearch/WebFetch |
| ISC-2 | research | OpenCode README/docs model list | List populated | WebFetch |
| ISC-3 | research | OpenCode feature matrix vs Claude Code | Gap analysis complete | WebSearch |
| ISC-4 | research | OpenCode MCP docs or issues | Boolean: supported/not | WebFetch |
| ISC-5 | research | OpenCode hooks/lifecycle docs | Boolean: supported/not | WebFetch |
| ISC-6 | analysis | Compare OpenCode extension model with PAI skill/hook pattern | Compatibility verdict | Analysis |
| ISC-7 | investigation | Hermes API surface — check running instance | Endpoint type identified | Bash/curl |
| ISC-8 | investigation | Hermes model list endpoint | Model list captured | Bash/curl |
| ISC-9 | read | Inference.ts current code | Non-Anthropic support visible | Read |
| ISC-10 | analysis | OpenAI-compatible endpoint pattern | Pattern assessed | Analysis |
| ISC-11 | synthesis | Rank approaches by cost/gain | Ranked list with rationale | Synthesis |
| ISC-12 | specification | Concrete implementation path | File:line changes named | Specification |
| ISC-13 | analysis | Webhook vs direct API comparison | Decision with rationale | Analysis |
| ISC-14 | analysis | Security review of Hermes routing | Risks identified | Analysis |
| ISC-15 | design | Routing logic design | Criteria defined | Design |
| ISC-16 | compliance | OAuth boundary check | Confirmed isolated | Read |
| ISC-17 | compliance | Hook pipeline compatibility check | No breakage confirmed | Analysis |
| ISC-18 | compliance | Recommendation check | No unwarranted replacement rec | Self-check |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| opencode-status | Research OpenCode current state: version, model support, MCP, hooks, PAI compatibility | ISC-1,ISC-2,ISC-3,ISC-4,ISC-5,ISC-6 | none | true |
| hermes-surface | Investigate Hermes API: endpoint type, model list, auth | ISC-7,ISC-8 | none | true |
| inference-current | Read Inference.ts to understand current multi-model support | ISC-9,ISC-10 | none | true |
| integration-design | Synthesize findings into ranked approaches with implementation path | ISC-11,ISC-12,ISC-13,ISC-14,ISC-15 | opencode-status,hermes-surface,inference-current | false |
| compliance-check | Verify security and compatibility constraints | ISC-16,ISC-17,ISC-18 | integration-design | false |

## Decisions

- 2026-06-07: Scoped this as research + recommendation, not implementation. No code changes this session — output is a decision + implementation path for Dom to approve.
- 2026-06-07: OpenCode confirmed as v1.16.2 (June 5 2026), 75+ providers, MCP + TypeScript hooks. Hermes = Dom's OpenCode-based assistant running on Webtop with multi-model API keys. Not a callable API service.
- 2026-06-07: PAI is already multi-model for coding: Forge (GPT-5.4) + Anvil (Kimi K2.6) via AnvilProgress.ts HTTP API pattern. Gap is general non-coding inference only.
- 2026-06-07: Ollama at 192.168.1.1:11434 has OpenAI-compatible API. Currently embedding + llama3.2:3b only. Pulling a larger model (llama3.3:70b, qwen2.5:72b) gives immediate non-Anthropic inference with zero new infrastructure.
- 2026-06-07: Recommended approach: Option A (extend Inference.ts with --provider flag for Ollama/OpenAI) using AnvilProgress.ts as the implementation pattern.
- 2026-06-07: OpenCode as Claude Code replacement not recommended — PAI's 600+ lines of hooks/skills/algorithm are Claude Code-specific; migrating would be major work for uncertain gain.
- 2026-06-07: OpenCode serve HTTP API reverse-engineered from JS bundle. True API paths are at `/session/*` (no `/api/` prefix for writes). Key endpoints: POST /session (create), POST /session/{id}/prompt_async (trigger inference, returns 204), GET /session/{id}/message (poll for response). The `/api/` prefix works for reads (health, model list) but writes return HTML SPA shell.
- 2026-06-07: Model selection doesn't force a specific model — openai-codex subscription defaults to gpt-5.5 regardless of modelID in session creation. This is acceptable; gpt-5.5 is the best available model.
- 2026-06-07: InferenceOpencode.ts built and verified: `verdict: success, final_message: "INFERENCE_OK"` in 3.6s. Located at PAI/TOOLS/InferenceOpencode.ts. Follows AnvilProgress.ts output contract exactly.
- 2026-06-07: 3-service.sh security fix: removed --hostname 0.0.0.0 (exposes auth tokens on LAN). Default bind is 127.0.0.1. 4-verify.sh corrected endpoints: /api/health and /api/model.

## Verification

- ISC-1: ✓ OpenCode v1.16.2, released 2026-06-05 — verified via research agent (GitHub sst/opencode)
- ISC-2: ✓ 75+ LLM providers via Models.dev — Claude, GPT, Gemini, DeepSeek, Ollama local models
- ISC-3: ✓ Feature gap assessed — OpenCode has MCP + hooks but lacks cloud features, routines, Agent View, PR automation; 78% slower in benchmarks
- ISC-4: ✓ OpenCode has MCP support — configurable MCP servers with auto-reconnect
- ISC-5: ✓ TypeScript plugin hooks with tool.execute.before/after lifecycle events
- ISC-6: ✓ Compatible in principle; PAI migration not recommended (Claude Code-specific hook pipeline)
- ISC-7: ✓ Hermes is OpenCode on Webtop — no callable API surface; Ollama at 192.168.1.1:11434 is the available OpenAI-compatible endpoint
- ISC-8: ✓ Ollama models: qwen3-embedding:4b, bge-m3, mxbai-embed-large, nomic-embed-text, llama3.2:3b — inference-grade model needs to be pulled
- ISC-9: ✓ Inference.ts is Claude-only (Haiku/Sonnet/Opus via claude subprocess). AnvilProgress.ts is the existing non-Anthropic HTTP API pattern.
- ISC-10: ✓ OpenAI-compatible pattern viable — Ollama v1/chat/completions endpoint confirmed working
- ISC-11: ✓ Ranked approaches produced — see recommendation below
- ISC-12: ✓ Implementation path named — extend Inference.ts with --provider flag, following AnvilProgress.ts pattern
- ISC-13: ✓ Webhooks inappropriate for synchronous inference — direct HTTP API is correct mechanism
- ISC-14: ✓ Security: new provider path must use API keys (not OAuth), separate from Anthropic billing
- ISC-15: ✓ Routing criteria defined: Ollama for cost-sensitive local tasks; OpenAI for cross-vendor second opinions; Claude remains primary
- ISC-16: ✓ Anthropic OAuth isolated — AnvilProgress.ts pattern deletes ANTHROPIC_* vars on non-Anthropic calls
- ISC-17: ✓ No hook pipeline impact — new inference path is additive to Inference.ts, Claude Code hooks unchanged
- ISC-18: ✓ OpenCode not recommended as replacement — noted as complement/parallel tool only
