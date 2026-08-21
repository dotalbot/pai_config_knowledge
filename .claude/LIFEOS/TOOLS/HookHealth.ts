#!/usr/bin/env bun
/**
 * HookHealth.ts — health check for every hook registered in settings.json.
 * Saved 2026-08-20 during the LifeOS migration (7.40.4 ships no Doctor.ts).
 *
 * For each registered hook: confirms the file exists, then fires it with a
 * synthetic event for its registered event type and reports pass/fail.
 *
 * Usage:  bun ~/.claude/LIFEOS/TOOLS/HookHealth.ts [--verbose]
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

// settings.json lives in the HARNESS root (~/.claude), which is not necessarily
// LIFEOS_CONFIG_DIR. Prefer an explicit override, else the harness root.
const HARNESS_ROOT = process.env.CLAUDE_CONFIG_DIR?.replace(/\/$/, "") || `${process.env.HOME}/.claude`;
const SETTINGS = `${HARNESS_ROOT}/settings.json`;
const VERBOSE = process.argv.includes("--verbose");

// Minimal synthetic payload per hook event. Hooks should tolerate a benign event.
const SYNTHETIC: Record<string, object> = {
  Stop: { stop_hook_active: false },
  SubagentStop: { stop_hook_active: false },
  PreToolUse: { tool_name: "Bash", tool_input: { command: "echo hi" } },
  PostToolUse: { tool_name: "Bash", tool_input: { command: "echo hi" }, tool_response: {} },
  UserPromptSubmit: { prompt: "health check ping" },
  SessionStart: { source: "startup" },
  SessionEnd: {},
  PreCompact: {},
  Notification: { message: "health" },
  TaskCreated: { task: { id: "health-check-task", description: "HookHealth synthetic probe task for validation" } },
  TaskUpdated: { task: { id: "health-check-task", description: "HookHealth synthetic probe task for validation" } },
};

// Hooks that legitimately exit non-zero (deny/block) on a benign probe are NOT
// failures — they're working as designed. Treat exit 2 as a pass-with-block.
const BENIGN_BLOCK = new Set(["2"]);

const settings = JSON.parse(readFileSync(SETTINGS, "utf8"));
const hooks = settings.hooks || {};

let pass = 0, fail = 0, missing = 0;
const failures: string[] = [];

for (const event of Object.keys(hooks)) {
  for (const group of hooks[event]) {
    for (const h of group.hooks || []) {
      const cmd: string = h.command || "";
      const m = cmd.match(/(\/\S+\.(ts|sh))/);
      if (!m) continue; // non-file command (e.g. http) — skip
      const file = m[1];
      const name = file.split("/").pop();
      if (!existsSync(file)) {
        missing++;
        failures.push(`MISSING  [${event}] ${name}`);
        console.log(`✗ MISSING  [${event}] ${name}`);
        continue;
      }
      const payload = JSON.stringify({ hook_event_name: event, session_id: "health", transcript_path: "/dev/null", ...(SYNTHETIC[event] || {}) });
      try {
        const runner = file.endsWith(".sh") ? "bash" : "bun";
        execSync(`echo '${payload.replace(/'/g, "'\\''")}' | timeout 25 ${runner} ${file}`, { stdio: VERBOSE ? "inherit" : "pipe", timeout: 27000 });
        pass++;
        if (VERBOSE) console.log(`✓ [${event}] ${name}`);
      } catch (e: any) {
        // exit 2 = deliberate deny/block on the benign probe — working as designed, not a failure.
        if (BENIGN_BLOCK.has(String(e.status))) {
          pass++;
          if (VERBOSE) console.log(`✓ [${event}] ${name} (blocks probe — working as designed)`);
          continue;
        }
        fail++;
        const err = (e.stderr?.toString() || e.message || "").split("\n").find((l: string) => /error|not found|throw/i.test(l))?.slice(0, 100) || `exit ${e.status}`;
        failures.push(`FAIL     [${event}] ${name} — ${err}`);
        console.log(`✗ FAIL     [${event}] ${name} — ${err}`);
      }
    }
  }
}

console.log(`\n${pass} pass · ${fail} fail · ${missing} missing-file`);
if (failures.length && !VERBOSE) { console.log("\nFailures:"); failures.forEach(f => console.log("  " + f)); }
process.exit(fail + missing > 0 ? 1 : 0);
