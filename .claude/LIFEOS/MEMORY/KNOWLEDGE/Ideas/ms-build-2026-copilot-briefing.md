---
type: knowledge
topic: Microsoft Build 2026 — Copilot ecosystem
date: 2026-06-08
tags: [microsoft, copilot, copilot-studio, agent-builder, build-2026, power-platform, foundry, MAI]
---

# Microsoft Build 2026 — Copilot Ecosystem Briefing

**Event:** June 2–3, 2026 | Fort Mason Center, San Francisco (~2,500 in-person + streaming)
**Theme:** "Be Yourself at Work" — AI agents adapt to how people work, not the reverse
**Narrative arc:** App era → Agent era. Six-layer agent stack: compute, models, context, tools, runtime, security.
**Book of News:** Replaced by [Microsoft Build Live blog](https://news.microsoft.com/build-2026-live-blog/microsoft-build-2026-live/)

## Key Facts

- **AI Builder credits are being SUNSET** — migrate existing deployments to Copilot Studio/Foundry now
- **Copilot Credits activation is OFF by default** — requires deliberate EA/admin opt-in
- **MAI routing in M365 Copilot is automatic** — Microsoft silently swaps OpenAI models for MAI where benchmarks match
- **Agent Builder** = lightweight no-code tier within M365 Copilot (not a separate product, not Copilot Studio)
- **AutoGen is in maintenance mode** — MAF 1.0 is the replacement path

## M365 Copilot

- Wave 3 rolling out (agentic capabilities in Word, Excel, PowerPoint, Outlook, Copilot Chat)
- **Cowork** — long-running multi-step work, uses Anthropic Claude (third-party model, notable)
- **ME7 (M365 E7)** GA May 1 — bundles E5 + M365 Copilot + Entra Suite + Agent 365, $99/user/month
- **Microsoft Scout** — always-on personal work agent (Frontier private preview) — Teams, Outlook, OneDrive, SharePoint. Each agent runs under its own Entra identity.
- **Microsoft IQ** — unified context layer, GA June 2:
  - Work IQ (M365 signals), Fabric IQ (structured business data), Foundry IQ (unified retrieval), Web IQ (AI-native web grounding — new at Build)
- **Copilot Memory** — user preferences in public preview; /chronicle feature for standup summaries
- New M365 Copilot UI — task-aware workspace, not just a prompt box

## Copilot Studio

- **Computer-Using Agents (CUA)** — GA May 7, 2026. UI automation without APIs. Enterprise credential management. Adaptive interface recovery.
- **Agent-to-Agent (A2A)** — GA May 2026. Visual designer, no SDK required.
- **Real-time voice agents** — GA (North America/Dynamics 365 Contact Center)
- **MCP support** — PP July 2026 → GA July 2026. Auto-imports MCP tools as actions with existing enterprise security.
- **New Workflows experience** — Early Release/Preview. Visual canvas replacing linear flow designer. Intent-driven modular model.
- **New orchestration layer** — Early Release. 20% performance improvement, 50% token reduction.
- **Declarative agent manifest v1.7** — new editorial_answers, default_response_mode properties
- **Agent 365** — GA April 2026. Centralised control plane for multi-environment agent management.
- PVA is fully gone — it's all Copilot Studio now.

## Agent Builder (Clarified)

Not a new product. It is the lightweight, conversational, in-M365-Copilot creation surface for declarative agents only.
- Included in M365 Copilot licence (no Copilot Studio licence or credits required)
- No Actions, no external service integration — purely declarative
- Cannot be used in Teams Chat (current limitation)
- Microsoft says: "If you need Actions to integrate external services, use Copilot Studio"
- No major new announcements at Build 2026 — existing GA capability

## MAI Model Family (7 models, announced at Build)

| Model | Details | Status |
|-------|---------|--------|
| MAI-Thinking-1 | 35B reasoning, 256K context, claimed better than Claude Sonnet 4.6 | Private preview |
| MAI-Code-1 | Replaces GPT-4 in GitHub Copilot | GA |
| MAI-Code-1-Flash | 5B efficient, code completion | GA |
| MAI-Image-2.5 | Multimodal | Announced |
| MAI-Voice-2 | Voice | Announced |
| MAI-Transcribe-1.5 | Transcription | Announced |

All 7 will be open-sourced under permissive licenses.
Microsoft goal: self-sufficiency, 10x cost efficiency vs GPT-5.5 for specific workloads.

## Power Platform AI

- Power Automate: self-healing desktop flows (GA), Copilot Studio-powered actions in cloud flows (GA)
- Fabric Apps: coding agents build custom web apps from semantic model spec
- AI Builder: credits being sunset — functionality moving to Copilot Studio and Foundry
- MCP server for Power Automate process intelligence

## Azure AI Foundry (was Azure AI Studio)

- **Foundry IQ** — GA. Unified retrieval: Work IQ + Fabric IQ + File Search + Azure SQL + MCP
- **Microsoft Agent Framework (MAF) 1.0** — GA April 2. Convergence of AutoGen + Semantic Kernel.
- **Hosted Agents** — GA July 2026. Per-session VM sandboxing, scale-to-zero, framework-agnostic.
- **Toolboxes** — Preview. Unified tool management (web, file, MCP, OpenAPI, A2A).
- **Tracing and Evaluations** — GA. OpenTelemetry-based, any framework.
- **Model catalogue** — 11,000+ models incl. GPT-5.5, Claude Opus 4.8/Sonnet 4.5/Haiku 4.5, MAI, Fireworks
- **Fireworks AI on Foundry** — GA. Open-model inference under Azure enterprise SLAs.
- **Agent Optimizer** — Private preview. Production signals → ranked improvement candidates.

## Safety / Responsible AI

- Dedicated RA track at Build (structural signal)
- ASSERT (open source, GA) — policy-driven evaluation framework
- Agent Control Specification (open standard, GA) — portable governance framework
- Built-in content safety guardrails with Hosted Agents (GA July)
- Multi-turn Evaluation (preview) — catches safety regression across long conversations
- Runtime DLP for agent prompts (Preview)
- MDASH (Expanded Preview) — 100+ AI scanning agents, 96.55% CyberGym benchmark

## Windows / On-Device

- Copilot+ PC brand de-emphasised — pivot to universal local AI platform on any Windows hardware
- Recall API (new) — app access to local semantic index without raw screenshots; on-device, Hello-encrypted
- Windows Copilot Runtime expanding to all Windows 11 with compatible NPUs
- Windows Development Configurations GA
- RTX Spark Dev Box announced (NVIDIA compact AI dev workstation)

## Competitive Signals

- MAI-Thinking-1 claimed preferred over Claude Sonnet 4.6 (blind eval by Surge); matches Opus 4.6 on coding
- Mustafa Suleyman: "less concerned about Google, Meta, OpenAI" — Anthropic is the primary benchmark competitor
- Foundry positioned as model-neutral control plane (includes Anthropic + OpenAI models alongside MAI)
- "Project Polaris" — internal initiative to route MAI over OpenAI where performance is equivalent

## EA Governance Gaps (From ApertureOscillation)

1. **MAI model-swap is automatic** — M365 Copilot and Dynamics 365 will swap OpenAI for MAI silently where benchmarks match. Enterprise contracts assuming specific model versions need review.
2. **Copilot Credits off by default** — EA must own the activation decision; don't let individual teams enable it without governance.
3. **Shadow agent proliferation** — 3-tier authoring surface (Agent Builder / Copilot Studio / MAF) will produce ungoverned agents. Agent 365 registry + Intune policies are the control gate.
4. **AI Builder migration needed now** — credits being sunset, migrate to Copilot Studio/Foundry.
5. **AutoGen → MAF migration** — if any team is actively building on AutoGen, plan the migration path.
