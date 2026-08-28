#!/usr/bin/env bun
/**
 * ConveyorPublish.ts — publish drafts Dom has approved by unpinning.
 *
 * Recipes spec §1-2. Stage 1 wrote a receipt into 00 INBOX carrying
 * `status: pinned`. Removing that pin is Dom's act of approval, and it is the
 * ONLY thing that triggers stage 2.
 *
 * Two guards, BOTH required before this touches anything:
 *   1. the note carries a `conveyor_job` field, and
 *   2. `status: pinned` is absent.
 * An organic inbox note has no job id, so it can never be published by this.
 *
 * STAGE 2 IS NOT IMPLEMENTED HERE. Recipes needing a model are prepared and
 * handed to the DA, never invoked by the timer. A timer publishes only what a
 * human already approved; it must not decide what the note should say.
 */
import { readdirSync, readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, appendFileSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { homedir } from "node:os";

const VERSION = "1.0.0";
const VAULT = join(homedir(), "obsidian");
const INBOX = join(VAULT, "00 INBOX");
const ROOT = join(homedir(), "conveyor");
const REVIEW = join(ROOT, "review"), DONE = join(ROOT, "done");
const STATE = join(homedir(), ".claude/LIFEOS/MEMORY/STATE");
const LOG = join(STATE, "conveyor-publish.jsonl");
const PENDING = join(STATE, "conveyor-stage2-pending.jsonl");
const CHASE_HOURS = 3;

type Draft = { path: string; fm: Record<string, string>; body: string };

function parse(path: string): Draft | null {
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    // Digits matter: `stage2_needs_model` was silently dropped by [a-z_]+,
    // so needsModel read false and every doc job auto-published to the vault
    // — the exact thing the review gate exists to prevent (caught 2026-08-27).
    const kv = line.match(/^([a-z][a-z0-9_]*):\s*(.*)$/i);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { path, fm, body: m[2] };
}

/** Dom's own words from the "Your context" section — part of the instruction. */
function addedContext(body: string): string {
  const m = body.match(/##\s*Your context\s*\n([\s\S]*?)(?=\n##\s|\s*$)/);
  if (!m) return "";
  return m[1].split("\n").filter(l => !l.trim().startsWith(">") && l.trim()).join("\n").trim();
}

function publish(d: Draft, dry: boolean): string {
  const jobid = d.fm.conveyor_job, recipe = d.fm.recipe ?? "unknown";
  const dest = d.fm.destination ?? "00 INBOX";
  // Fail CLOSED. An unreadable or missing flag must never mean "publish it".
  const needsModel = d.fm.stage2_needs_model !== "false";
  const ctx = addedContext(d.body);
  const name = basename(d.path).replace(/^DRAFT — /, "");
  const target = join(VAULT, dest, name);

  if (needsModel) {
    // Stage 2 is model work. Queue it; the DA runs it, not this timer.
    if (!dry) {
      appendFileSync(PENDING, JSON.stringify({
        ts: new Date().toISOString(), job: jobid, recipe, draft: d.path,
        destination: dest, added_context: ctx || null, has_context: !!ctx,
      }) + "\n");
    }
    return `queued for stage 2 (${recipe}${ctx ? ", with context" : ", no context added"})`;
  }

  // Deterministic recipes publish directly.
  if (dry) return `would publish → ${dest}/${name}`;
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) return `SKIPPED — ${dest}/${name} already exists`;

  // §1: instructions are retained at the end, for future reference and analysis.
  const withInstructions = d.body.trimEnd() + [
    "", "", "---", "", "## Instructions", "",
    `Produced by recipe **${recipe}** from Conveyor job \`${jobid}\`.`, "",
    ctx ? `**Context added on approval:**\n\n${ctx}` : "*No context was added on approval.*",
    "", `*Published ${new Date().toISOString().slice(0, 16).replace("T", " ")} by ConveyorPublish ${VERSION}.*`, "",
  ].join("\n");
  writeFileSync(target, withInstructions);
  // The spent receipt belongs with its job, not in the inbox. Renaming it to
  // .published left litter exactly where Dom reads (caught 2026-08-27), so it
  // moves into the job directory as part of the audit trail instead.
  const jobDir = existsSync(join(REVIEW, jobid)) ? join(REVIEW, jobid) : join(DONE, jobid);
  if (existsSync(jobDir)) renameSync(d.path, join(jobDir, "receipt.md"));
  else renameSync(d.path, d.path + ".published");   // no job dir: keep it rather than lose it

  const from = join(REVIEW, jobid);
  if (existsSync(from) && !existsSync(join(DONE, jobid))) {
    mkdirSync(DONE, { recursive: true });
    renameSync(from, join(DONE, jobid));
  }
  return `published → ${dest}/${name}`;
}

function main() {
  const dry = process.argv.includes("--dry-run");
  const only = process.argv.find(a => a.startsWith("--job="))?.slice(6);
  mkdirSync(STATE, { recursive: true });
  let acted = 0, pinned = 0, chase: string[] = [];

  for (const f of existsSync(INBOX) ? readdirSync(INBOX) : []) {
    if (!f.endsWith(".md")) continue;
    const d = parse(join(INBOX, f));
    if (!d?.fm.conveyor_job) continue;                    // guard 1: not a conveyor draft
    if (only && d.fm.conveyor_job !== only) continue;
    if (d.fm.status === "pinned") {                       // guard 2: still pinned
      pinned++;
      const age = (Date.now() - statSync(d.path).mtimeMs) / 3.6e6;
      if (age > CHASE_HOURS) chase.push(`${d.fm.conveyor_job} (${age.toFixed(0)}h)`);
      continue;
    }
    const r = publish(d, dry);
    acted++;
    console.log(`  ${d.fm.conveyor_job}: ${r}`);
    if (!dry) appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), job: d.fm.conveyor_job, result: r, publisher: VERSION }) + "\n");
  }

  console.log(`publisher ${VERSION}${dry ? " (dry run)" : ""}: acted=${acted} still_pinned=${pinned}`);
  if (chase.length) console.log(`  awaiting review >${CHASE_HOURS}h: ${chase.join(", ")}`);
}
main();
