#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * @version 1.0.0
 * TRIGGER: PreToolUse (Write|Edit|MultiEdit) — via PreToolGuard dispatcher
 * LearningQualityGate — refuse junk writes into MEMORY/LEARNING.
 *
 * WHY (2026-09-11): the learning corpus was growing while its signal fell.
 * SessionHarvester matched CORRECTION_PATTERNS against every transcript entry
 * with `type === 'user'`, but that type covers far more than what the principal
 * typed: skill invocations, pasted files, hook context, task notifications and
 * inter-agent envelopes all arrive as "user". The pattern /actually,?\s+/i fired
 * on any of them.
 *
 * Measured that day across MEMORY/LEARNING/{ALGORITHM,SYSTEM}: 136 captures,
 * 113 triggered by "actually" and 19 by "wait"; 22 files held whole skill bodies
 * or `ls -la` output stored as a learning. Re-running the gate over the same
 * corpus keeps 9 — every one an actual typed correction or stated insight.
 *
 * The failure mode is the dangerous kind: silent, and it looks like success.
 * File counts rise, timestamps look fresh, nothing errors, and the downstream
 * consumers (KnowledgeHarvester, LearningPatternSynthesis) synthesise noise.
 *
 * WHY A GATE AND NOT A PATCH: three writers share this path today
 * (SessionHarvester, SatisfactionCapture, WorkCompletionLearning) and the next
 * one will not know the rule. Enforcing at the filesystem boundary binds every
 * writer, including ones not yet written. The shared admission test lives in
 * hooks/lib/learning-utils.ts (`rejectLearning`) so callers can pre-filter too.
 *
 * FAIL-OPEN: anything unparseable, or any path outside MEMORY/LEARNING, allows.
 * A gate that blocks on its own confusion is worse than the junk it stops.
 *
 * EXIT CODES: handled by the PreToolGuard dispatcher (0 = allow, 2 = deny).
 */

import { rejectLearning } from "./lib/learning-utils";

type BlockResult = { block: true; message: string } | null;

/** Learning-note writes we police. Other files under MEMORY/ are not ours. */
const LEARNING_PATH = /\/LIFEOS\/MEMORY\/LEARNING\/(ALGORITHM|SYSTEM|FAILURES)\//;

/** Pull the prose under "## Learning" — the part that must earn its place. */
export function extractLearningBody(content: string): string {
  const afterHeading = content.split(/^##\s+Learning\s*$/m)[1];
  const body = (afterHeading ?? content).split(/^---\s*$/m)[0];
  return body.trim();
}

export function check(input: any): BlockResult {
  const tool = input?.tool_name;
  if (tool !== "Write" && tool !== "Edit" && tool !== "MultiEdit") return null;

  const path = input?.tool_input?.file_path;
  if (typeof path !== "string" || !LEARNING_PATH.test(path)) return null;

  // Write carries content; Edit/MultiEdit carry replacement text.
  const content =
    input?.tool_input?.content ??
    input?.tool_input?.new_string ??
    input?.tool_input?.edits?.map((e: any) => e?.new_string ?? "").join("\n");
  if (typeof content !== "string" || !content.trim()) return null;

  const reason = rejectLearning(extractLearningBody(content));
  if (!reason) return null;

  return {
    block: true,
    message:
      `[LearningQualityGate] refused a learning write to ${path}: ${reason}.\n` +
      `A learning is something SAID — a correction the principal typed, or an insight stated in prose. ` +
      `Pasted skill bodies, directory listings, agent briefs, task notifications and serialized events are artifacts, not learning. ` +
      `(2026-09-11: 113 of 136 captures had fired on the bare word "actually".)\n` +
      `If this genuinely is a learning, write the insight in your own words rather than the transcript it came from.\n`,
  };
}

if (import.meta.main) {
  const raw = await Bun.stdin.text();
  let input: unknown;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const r = check(input);
  if (r) { console.error(r.message); process.exit(2); }
  process.exit(0);
}
