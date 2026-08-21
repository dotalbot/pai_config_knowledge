# Operational Rules — Dom

> Ported from the pre-LifeOS CLAUDE.md Operational Rules during the 2026-08-20 migration to LifeOS 7.40.4. Paths updated PAI→LIFEOS; OpenCode inference retired.

## Rules

- bun/bunx always. Never npm/npx. Zero exceptions.
- TypeScript always. Never Python unless Dom explicitly approves.
- Never hardcode paths. Use `${LIFEOS_DIR}`, `${HOME}`, relative paths. **Never a literal `$HOME/…` inside a settings.json or hook command** — the harness injects env values verbatim, so an unbraced `$HOME` creates a real `$HOME/` junk directory. Use the absolute path there.
- Never run `claude` subprocess inline. CLAUDECODE env blocks nested sessions. Verify edits by reading diffs.
- Never respond to duplicate task notifications. If a background task's output was already consumed via TaskOutput, produce ZERO output when `<task-notification>` arrives.
- Markdown zealot. Never HTML for content markdown supports. HTML only for `<details>`, `<aside>`, `<callout>`. Never XML tags in prompts — use markdown headers.
- Plan means stop. "Create a plan" = present and STOP. No execution without approval.
- Build over ask for reversible actions. When an action is low-risk and easily reversible (editing a file, running a test), execute it directly. Reserve AskUserQuestion for irreversible or high-impact decisions. Momentum matters.
- **Claude is the primary inference path (OpenCode retired 2026-08-20).** Call `Inference.ts` WITHOUT `--opencode` at every tier — model tiers resolve to Claude (fast=haiku, standard=sonnet, smart=claude-fable-5). The former OpenCode/GPT-5.5 backend on `localhost:7878` has been archived and shut down.
- Reproduce before fixing. Reported UI bug = open the page with the **Interceptor skill** FIRST. Console errors and network 404s before code analysis. Never theorize from code when you can just look.
- Interceptor for ALL web verification. Every time you create, fix, deploy, or claim anything works on the web — verify with Interceptor. Never use agent-browser for verification.

## Notes

- Effort shortcuts: `/e1` (Standard+fast-path), `/e2` (Extended), `/e3` (Advanced), `/e4` (Deep), `/e5` (Comprehensive). Append to any message to override auto-detection.
- Units: Metric (Celsius, meters, kilograms).
- Tools: `rg` over `grep`, `fd` over `find`.
