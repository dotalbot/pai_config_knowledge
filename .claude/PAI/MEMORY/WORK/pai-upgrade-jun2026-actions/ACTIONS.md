# PAIUpgrade Actions — 2026-06-11

**Status:** Pending — saved for later session
**Source:** PAIUpgrade Upgrade workflow run 2026-06-11
**Resume:** Tell JellyPai "implement the PAI upgrade actions from June 11"

---

## 🔴 CRITICAL (3)

- [x] **1. Stop hook `additionalContext`** — Add to `hooks/DocIntegrity.hook.ts` and `hooks/WorkCompletionLearning.hook.ts`; return `hookSpecificOutput.additionalContext` with violation/learning summaries so they inject feedback back into sessions instead of running silently. (v2.1.163)

- [x] **2. `--safe-mode` diagnostic** — Add `CLAUDE_CODE_SAFE_MODE=true claude` as Step 0 to `PAI/DOCUMENTATION/Hooks/HookSystem.md` troubleshooting section and `skills/RootCauseAnalysis/` workflows. (v2.1.169)

- [x] **3. PATTERNS.yaml bypass gaps** — Add three blocked patterns to `PAI/USER/SECURITY/PATTERNS.yaml`: backslash-escape bypass (`r\m`), IFS manipulation (`IFS=;`), archive-pipe exfiltration (`tar|nc`).

---

## 🟠 HIGH (6)

- [x] **4. `continueOnBlock: true`** — Add to ContentScanner PostToolUse entries in `settings.json`; removes the "PostToolUse cannot block" workaround comment. (v2.1.139)

- [x] **5. `args: []` exec-form** — Add to SecurityPipeline and PromptGuard PreToolUse entries in `settings.json`; removes shell as attack surface. (v2.1.139)

- [x] **6. `fallbackModel`** — Add `"fallbackModel": ["claude-opus-4-8", "claude-sonnet-4-6"]` to `settings.json` top-level. (v2.1.166)

- [ ] **7. Inference.ts thinking params** — Add `thinking_budget` and `effort_level: xhigh` params to `PAI/TOOLS/Inference.ts` for E4/E5 tiers. (Claude Code Guide)

- [x] **8. `MAX_THINKING_TOKENS=0` for E1/E2** — Document in `PAI/ALGORITHM/mode-detection.md`; add to `settings.json` env block for fast-path sessions. (v2.1.166)

- [x] **9. `claude --bg --exec` sanctioned pattern** — Document in `PAI/DOCUMENTATION/Agents/AgentSystem.md` and `skills/Daemon/SKILL.md` as the approved background execution path. (v2.1.154)

---

## 🟡 MEDIUM (5)

- [ ] **10. `MessageDisplay` hook** — Wire new event in `settings.json`; create `hooks/MessageDisplay.hook.ts` for output filtering/transformation. (v2.1.157)

- [ ] **11. `post-session` hook** — Wire new event in `settings.json`; create `hooks/PostSession.hook.ts` for automatic WORK snapshot. (v2.1.169)

- [x] **12. `requiredMinimumVersion`** — Add `"requiredMinimumVersion": "2.1.139"` to `settings.json`. (v2.1.163)

- [x] **13. Sub-agent 5-level nesting** — Document new ceiling in `PAI/DOCUMENTATION/Agents/AgentSystem.md` and `skills/Delegation/SKILL.md`. (v2.1.172)

- [x] **14. ISA pivot check at EXECUTE** — Add gate to `PAI/ALGORITHM/v6.3.0.md` EXECUTE entry: if scope diverged from ISA Goal, re-check before proceeding.

- [ ] **15. Lazy skill loading** — Refactor `hooks/LoadContext.hook.ts` to stub at SessionStart (~1KB), full load on first delegation; saves ~6.6K tokens/session.

---

## 🟢 LOW (3)

- [x] **16. `CLAUDE.local.md`** — Create `~/.claude/CLAUDE.local.md` for Dom-specific personal overrides (gitignored). (v2.1.157)

- [x] **17. `effortLevel` setting** — Add `"effortLevel": "standard"` to `settings.json` top-level. (Claude Code Guide)

- [ ] **18. Voice ID drift** — Align Algorithm voice curl in `PAI/ALGORITHM/v6.3.0.md:108` with `DA_IDENTITY.md` algorithm voice (`pNInz6obpgDQGcFmaJgB`).

---

## 🔄 Registry Updates (pending)

- [x] Add "Quality Gate Injection" Stop hook pattern to `PAI/DOCUMENTATION/Hooks/HookSystem.md` (additionalContext pattern documented inline)
- [x] Add `--safe-mode` Step 0 to `skills/RootCauseAnalysis/Workflows/` (added to SKILL.md Gotchas)
- [x] Add sanctioned `--bg --exec` subsection to `PAI/DOCUMENTATION/Agents/AgentSystem.md`
- [x] Add ISA pivot check gate to `PAI/ALGORITHM/v6.3.0.md` EXECUTE phase

---

## 🪞 Internal Reflections (pending)

- [x] Add PATTERNS.yaml regex smoke-test gate to `PAI/DOCUMENTATION/Security/SecuritySystem.md`
- [x] Add inventory re-verify step to OBSERVE preflight in `PAI/ALGORITHM/v6.3.0.md`
