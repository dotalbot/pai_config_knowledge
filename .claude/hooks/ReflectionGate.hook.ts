#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * @version 1.0.0
 * TRIGGER: Stop — via the StopGates dispatcher
 * ReflectionGate — the learn step's missing closer.
 *
 * WHY (2026-09-11): the reflection corpus had been dead since 2026-06-12 —
 * 7 entries, none carrying the schema-9 `reflection` field that landed
 * 2026-07-28. Diagnosis that day found a loop with no closer:
 *
 *   1. Reflect.ts is a MODEL-INVOKED CLI. Nothing in hooks/, settings.json or
 *      SERVICES/ calls it, so a reflection exists only if the run types it.
 *   2. AlgorithmNudge, which would remind the run, gates on isTrackedRow()
 *      (AlgorithmNudge.hook.ts:240) — a non-empty `isa` field. 21 of 22
 *      work.json sessions had none, so no run qualified for the reminder.
 *
 * A 2026-09-02 record called this behavioural and set a one-week re-check:
 * if runs were still unregistered under real use, it earns a mechanism.
 * Nine days later the ratio was unchanged, so the hypothesis was falsified
 * on its own terms and this gate is the mechanism.
 *
 * WHY A NUDGE AND NOT AN AUTO-WRITE: `--reflection` carries the self-critique
 * ("what would a smarter run have done"). That is a judgement only the model
 * can author; a hook fabricating it would refill the corpus with exactly the
 * kind of noise the LearningQualityGate was built the same day to keep out.
 * So this gate asks, it never writes.
 *
 * BLOCK iff ALL hold; any failure ⇒ PASS (default pass, fail-open):
 *   1. not a stop-hook recovery pass (loop guard)
 *   2. the last message asserts completion of a claimable unit
 *      (reuses ISACloseGate's completionUnit split)
 *   3. the turn did real work — a write-shaped tool call in this transcript
 *   4. no reflection was appended for this session already
 *   5. not already fired for this session (once per session, never a nag)
 *
 * EXIT CODES: handled by the StopGates dispatcher (0 = allow, 2 = block).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { completionUnit } from "./ISACloseGate.hook";

const LIFEOS = process.env.LIFEOS_DIR ?? join(homedir(), ".claude", "LIFEOS");
const REFLECTIONS = join(LIFEOS, "MEMORY", "LEARNING", "REFLECTIONS", "algorithm-reflections.jsonl");
const STATE_PATH = join(LIFEOS, "MEMORY", "STATE", "reflection-gate-fired.json");

type HookInput = {
  session_id?: string;
  last_assistant_message?: string;
  transcript_path?: string;
  stop_hook_active?: boolean;
};

/** Tools whose use means the turn changed something, not just answered. */
const WRITE_TOOLS = /"name"\s*:\s*"(Write|Edit|MultiEdit|NotebookEdit)"/;
/** A Bash call that writes rather than reads. Deliberately conservative. */
const WRITE_BASH = /"command"\s*:\s*"[^"]*(?:>>|\bgit commit\b|\bmv\b|\brm\b|\bmkdir\b|\btee\b)/;

/** Did this turn actually mutate anything? Pure; exported for tests. */
export function didRealWork(transcript: string): boolean {
  return WRITE_TOOLS.test(transcript) || WRITE_BASH.test(transcript);
}

/** Has a reflection already been written for this session? Pure; exported. */
export function hasReflection(corpus: string, sessionId: string): boolean {
  if (!sessionId) return false;
  for (const line of corpus.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.session_id === sessionId || r.session === sessionId) return true;
    } catch { /* a malformed line is not a reflection */ }
  }
  return false;
}

function alreadyFired(session: string): boolean {
  try {
    if (!existsSync(STATE_PATH)) return false;
    return (JSON.parse(readFileSync(STATE_PATH, "utf-8")) as string[]).includes(session);
  } catch { return false; }
}

function markFired(session: string): void {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    let seen: string[] = [];
    if (existsSync(STATE_PATH)) seen = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
    if (!seen.includes(session)) seen.push(session);
    writeFileSync(STATE_PATH, JSON.stringify(seen.slice(-200)), "utf-8");
  } catch { /* state is an optimisation, never a blocker */ }
}

export function check(input: HookInput): { block: true; message: string } | null {
  if (process.env.REFLECTIONGATE_OFF === "1") return null;
  if (input.stop_hook_active === true) return null;

  const session = input.session_id ?? "";
  if (!session) return null;
  if (alreadyFired(session)) return null;

  const message = input.last_assistant_message ?? "";
  if (!message.trim()) return null;
  if (!completionUnit(message)) return null;

  let transcript = "";
  try {
    if (!input.transcript_path || !existsSync(input.transcript_path)) return null;
    transcript = readFileSync(input.transcript_path, "utf-8");
  } catch { return null; }
  if (!didRealWork(transcript)) return null;

  let corpus = "";
  try { corpus = existsSync(REFLECTIONS) ? readFileSync(REFLECTIONS, "utf-8") : ""; } catch { return null; }
  if (hasReflection(corpus, session)) return null;

  markFired(session);
  return {
    block: true,
    message:
      `REFLECTION MISSING [ReflectionGate]. This turn completed real work and no reflection was written for it.\n` +
      `The Algorithm's learn step closes with one honest self-critique — what would a smarter run have done:\n\n` +
      `  bun ${join(LIFEOS, "TOOLS", "Reflect.ts")} --session ${session} --slug <slug> --reflection "..."\n\n` +
      `Operational fields are derived by the tool; never self-score them. Write the reflection, then restate.\n` +
      `Fires once per session. (2026-09-11: the corpus had been dead since 2026-06-12 because nothing ever called Reflect.ts.)\n`,
  };
}

/** StopGates dispatcher shape: async, returns a decision object or null. */
export async function run(input: HookInput): Promise<object | null> {
  const r = check(input);
  return r ? { decision: "block", reason: r.message } : null;
}

if (import.meta.main) {
  const raw = await Bun.stdin.text();
  let input: HookInput;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const r = check(input);
  if (r) { console.error(r.message); process.exit(2); }
  process.exit(0);
}
