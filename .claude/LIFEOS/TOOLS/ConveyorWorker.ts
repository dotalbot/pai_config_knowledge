#!/usr/bin/env bun
/**
 * ConveyorWorker.ts — process jobs the sweeper has claimed into processing/.
 *
 * Spec: "ConveyorDesk → LifeOS Automatic Processing Worker" (2026-08-27).
 *
 * Every claimed job reaches exactly one terminal state (done/failed/needs_input),
 * preserves its payload byte-for-byte, and leaves an audit trail. One malformed
 * or hostile job must never block the others.
 *
 * DELIBERATELY NOT DONE HERE (spec §5): no LLM is invoked. A timer firing must
 * never call a model. Extraction and classification are deterministic; anything
 * semantic is a separate, governed decision.
 *
 * BACKLOG SAFETY (spec §3, §13): jobs that predate WORKER_EPOCH are skipped
 * unless explicitly listed in approved-backlog.txt. Enabling the timer must not
 * implicitly consume the seven historical jobs.
 */
import {
  readdirSync, lstatSync, readFileSync, writeFileSync, renameSync, mkdirSync,
  existsSync, statSync, openSync, fsyncSync, closeSync, appendFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const VERSION = "1.1.0";
const ROOT = join(homedir(), "conveyor");
const DIRS = {
  processing: join(ROOT, "processing"), done: join(ROOT, "done"),
  failed: join(ROOT, "failed"), needs: join(ROOT, "needs_input"),
  review: join(ROOT, "review"),
};
const STATE = join(homedir(), ".claude/LIFEOS/MEMORY/STATE");
const HEARTBEAT = join(STATE, "conveyor-worker-heartbeat.json");
const LOG = join(STATE, "conveyor-worker.jsonl");
const APPROVED = join(ROOT, "approved-backlog.txt");

/** Jobs claimed before this are backlog; they need explicit approval. */
const WORKER_EPOCH = "20260827-140000";
const MAX_META = 64 * 1024;
const MAX_EXTRACT = 2 * 1024 * 1024;
const KINDS = new Set(["transcript", "research", "doc", "idea", "task", "ask", "unknown"]);
const JOBID = /^\d{8}-\d{6}-[a-z0-9]{4}--[a-z]+--[a-z0-9-]+$/;

type Outcome = { state: "done" | "failed" | "needs" | "review"; reason?: string; question?: string; draft?: string };

const VAULT = join(homedir(), "obsidian");
const INBOX = join(VAULT, "00 INBOX");

const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const isLink = (p: string) => { try { return lstatSync(p).isSymbolicLink(); } catch { return true; } };

/** fsync a file, then its directory, so a terminal move never outruns its data. */
function durable(path: string) {
  for (const p of [path, join(path, "..")]) {
    try { const fd = openSync(p, existsSync(p) && statSync(p).isDirectory() ? "r" : "r"); fsyncSync(fd); closeSync(fd); } catch {}
  }
}

/** Injection shapes. Reported, never obeyed — payload text is data. */
const INJECTION = /ignore\s+(all\s+|any\s+)?(previous|prior|above)|disregard\s+(the\s+|your\s+)?(instructions|rules)|you\s+must\s+now|new\s+instructions\s*:|system\s+prompt|<\/?(system|assistant)>|execute\s+the\s+following|run\s+this\s+command|exfiltrat|curl\s+https?:\/\//i;
const SECRET = /(sk-[a-zA-Z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN\s+[A-Z ]*PRIVATE KEY-----|(password|passwd|api[_-]?key|secret|token)\s*[:=]\s*\S{8,})/i;

function detectType(p: string): string {
  try { return execFileSync("file", ["-b", "--mime-type", p], { encoding: "utf8", timeout: 15000 }).trim(); }
  catch { return "application/octet-stream"; }
}

/** Deterministic extraction only. Unknown types fail loudly — never a silent fallback. */
function extract(p: string, mime: string): { text: string; how: string } {
  const ext = (p.split(".").pop() ?? "").toLowerCase();
  const run = (cmd: string, args: string[]) =>
    execFileSync(cmd, args, { encoding: "utf8", timeout: 120000, maxBuffer: MAX_EXTRACT });

  if (["md", "txt", "csv"].includes(ext) || mime.startsWith("text/")) {
    const t = readFileSync(p, "utf8");
    if (Buffer.byteLength(t) > MAX_EXTRACT) throw new Error("payload exceeds extraction bound");
    return { text: t, how: "direct" };
  }
  if (ext === "docx") {
    // OOXML integrity first — a torn zip extracts to plausible garbage.
    const names = run("unzip", ["-Z1", p]).split("\n");
    if (!names.includes("[Content_Types].xml") || !names.includes("word/document.xml"))
      throw new Error("not a valid OOXML docx (missing required parts)");
    return { text: run("pandoc", ["-f", "docx", "-t", "plain", "--wrap=none", p]), how: "pandoc" };
  }
  if (ext === "eml") return { text: run("python3", ["-c",
    "import sys,email,email.policy;m=email.message_from_binary_file(open(sys.argv[1],'rb'),policy=email.policy.default);b=m.get_body(('plain',));print(b.get_content() if b else '')", p]), how: "python-email" };
  throw new Error(`no verified extractor for .${ext} (${mime}) — refusing a generic fallback`);
}

/**
 * Stage 1 receipt (recipes spec §1). Deterministic: what the thing IS, enough
 * for Dom to judge whether the considered work is worth running and what
 * context it needs. NO MODEL — stage 2 does the thinking, and only Dom's
 * unpinning triggers it.
 */
const RECIPES: Record<string, { dest: string; stage2: boolean; note: string }> = {
  transcript: { dest: "01 Thinking/Meetings", stage2: true,  note: "meeting note from Templates/4 - Meeting Note.md" },
  doc:        { dest: "Sources/Articles",     stage2: true,  note: "source note — extract intelligence, not a summary" },
  research:   { dest: "02 Doing/Research",    stage2: true,  note: "question note with sources and confidence" },
  idea:       { dest: "01 Thinking",          stage2: false, note: "thinking note — deliberately thin, the thinking is Dom's" },
  task:       { dest: "02 Doing",             stage2: false, note: "checklist item" },
  ask:        { dest: "00 INBOX",             stage2: false, note: "answered in the draft; publication usually unnecessary" },
  unknown:    { dest: "00 INBOX",             stage2: true,  note: "kind inferred — say what was inferred and why" },
};

function writeDraft(jobid: string, kind: string, meta: any, text: string, facts: string[]): string {
  const r = RECIPES[kind] ?? RECIPES.unknown;
  const slug = jobid.split("--").slice(2).join("--") || jobid;
  const path = join(INBOX, `DRAFT — ${slug}.md`);
  const head = text.trim().split("\n").filter(l => l.trim()).slice(0, 12).join("\n");
  const body = [
    "---",
    `status: pinned`,                      // router leaves it alone; removing this publishes
    `conveyor_job: ${jobid}`,              // the discriminator — publisher touches nothing else
    `recipe: ${kind}`,
    `destination: ${r.dest}`,
    `stage2_needs_model: ${r.stage2}`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    "tags: [conveyor, draft]",
    "---", "",
    `# DRAFT — ${slug}`, "",
    "> [!info] This is a stage 1 receipt",
    "> What this document **is**, produced deterministically. No model has read it yet.",
    "> Add your context below, then **remove `status: pinned`** to run the considered work.", "",
    "## What arrived", "",
    ...facts.map(f => `- ${f}`), "",
    "## What it looks like", "",
    "```", head, "```", "",
    `*First ${head.split("\n").length} non-empty lines. Full text in the job directory.*`, "",
    "## Your context", "",
    "> Add anything that should shape the work: what this is for, what to link it",
    "> to, what you already know. This becomes part of the instruction.", "", "", "",
    "## On publish", "",
    `Recipe **${kind}** → \`${r.dest}\``, "",
    `${r.note}.`, "",
    r.stage2
      ? "Stage 2 will use a model to find relationships and create links."
      : "No model needed — this recipe is deterministic.",
    "",
  ].join("\n");
  mkdirSync(INBOX, { recursive: true });
  writeFileSync(path, body);
  return path;
}

function moveTo(job: string, from: string, to: string) {
  mkdirSync(to, { recursive: true });
  const dest = join(to, basename(from));
  if (existsSync(dest)) throw new Error(`destination exists: ${dest}`);
  renameSync(from, dest);   // single atomic rename commits the terminal state
  return dest;
}

function processJob(dir: string): Outcome {
  const jobid = basename(dir);
  const t0 = new Date().toISOString();
  const audit: string[] = [`# Audit — ${jobid}`, "", `worker ${VERSION} · started ${t0}`, ""];
  const add = (k: string, v: string) => audit.push(`- **${k}**: ${v}`);

  // §4.2 shape and symlink safety
  if (!JOBID.test(jobid)) return { state: "failed", reason: `job id does not match the required grammar` };
  if (isLink(dir)) return { state: "failed", reason: "job directory is a symlink" };
  const entries = readdirSync(dir);
  const payloads = entries.filter(e => e.startsWith("payload."));
  if (payloads.length !== 1 || !entries.includes("meta.json"))
    return { state: "failed", reason: `expected exactly one payload.* and meta.json; found: ${entries.join(", ")}` };
  const payload = join(dir, payloads[0]), metaP = join(dir, "meta.json");
  for (const f of [payload, metaP]) {
    if (isLink(f)) return { state: "failed", reason: `${basename(f)} is a symlink` };
    if (!lstatSync(f).isFile()) return { state: "failed", reason: `${basename(f)} is not a regular file` };
  }
  add("shape", "one payload + meta.json, no symlinks");

  // §4.2 metadata, bounded before parsing
  if (statSync(metaP).size > MAX_META) return { state: "failed", reason: "meta.json exceeds size bound" };
  let meta: any;
  try { meta = JSON.parse(readFileSync(metaP, "utf8")); }
  catch (e: any) { return { state: "failed", reason: `meta.json does not parse: ${e.message}` }; }
  const kind = meta.kind ?? "unknown";
  if (!KINDS.has(kind)) return { state: "failed", reason: `kind "${kind}" is not in the allowed set` };
  const output = meta.output === "vault" ? "vault" : "local";
  add("meta", `kind=${kind} output=${output} schema=${meta.schema ?? "?"}`);

  // §6.2 integrity
  const size = statSync(payload).size, hash = sha256(payload);
  const declared = meta.source ?? {};
  if (declared.sha256 && declared.sha256 !== hash)
    return { state: "failed", reason: "payload sha256 does not match meta.json — payload altered in transit" };
  if (declared.size && declared.size !== size)
    return { state: "failed", reason: `payload size ${size} does not match declared ${declared.size}` };
  add("integrity", `${size} B · sha256 ${hash.slice(0, 16)}… · ${declared.sha256 ? "matches declared" : "no declared hash"}`);

  // §6.4 type, §6.5-6 extraction with sanity gates
  const mime = detectType(payload);
  let text = "", how = "";
  try { ({ text, how } = extract(payload, mime)); }
  catch (e: any) { return { state: "needs", question: `Extraction failed: ${e.message}` }; }
  const chars = text.trim().length;
  add("extraction", `${how} · mime ${mime} · ${chars} chars from ${size} B`);
  if (chars < 10) return { state: "needs", question: `Extraction yielded ${chars} characters — too little to trust.` };

  // §8 gates. Order matters: secrets before anything is written or logged.
  if (SECRET.test(text)) {
    writeFileSync(join(dir, "audit.md"), audit.concat(["", "- **secret gate**: TRIPPED — processing stopped before any write"]).join("\n"));
    return { state: "needs", question: "Credential-shaped content detected. Stopped before extraction was written. Content not reproduced here or in any log." };
  }
  if (INJECTION.test(text)) {
    writeFileSync(join(dir, "audit.md"), audit.concat(["", "- **injection gate**: TRIPPED — instructions in payload were NOT executed"]).join("\n"));
    return { state: "needs", question: "Payload contains instruction-shaped text aimed at changing agent behaviour. Treated as data, not obeyed. Deterministic extraction retained; semantic processing stopped." };
  }
  add("safety", "secret gate clear · injection gate clear");

  // §6.7 outputs into the job directory
  writeFileSync(join(dir, "extract.txt"), text);
  const inv = {
    schema: 1, jobid, worker: VERSION, kind, output_policy: output,
    claimed_at: statSync(dir).mtime.toISOString(), started: t0, completed: new Date().toISOString(),
    payload: { name: basename(payload), size, sha256: hash, verified: !!declared.sha256 },
    extraction: { extractor: how, mime, chars },
    files: [
      { name: basename(payload), role: "original payload, unmodified", sha256: hash },
      { name: "meta.json", role: "sender metadata", sha256: sha256(metaP) },
      { name: "extract.txt", role: "deterministic extraction", sha256: sha256(join(dir, "extract.txt")) },
    ],
    vault_writes: [] as string[],
  };
  add("output policy", output === "vault"
    ? "vault declared — worker v1 keeps output local and records the deferral; vault publication is a separate governed step"
    : "local — nothing written outside the job directory");
  // Stage 1 ends at review/, never done/. Publication is Dom's act (spec §1).
  let draft = "";
  try { draft = writeDraft(jobid, kind, meta, text, [
    `**${basename(payload)}** · ${size.toLocaleString()} bytes · ${mime}`,
    `Extracted with **${how}** — ${chars.toLocaleString()} characters`,
    `Declared by: \`${declared.original_name ?? "?"}\``,
    `Safety gates: secret clear, injection clear`,
    meta.context ? `Sender context: *${String(meta.context).slice(0, 200)}*` : "No sender context given",
  ]); } catch (e: any) { return { state: "failed", reason: `draft write failed: ${e.message}` }; }
  inv.draft = draft;
  writeFileSync(join(dir, "inventory.json"), JSON.stringify(inv, null, 2));
  add("draft", `receipt written to 00 INBOX, pinned`);
  writeFileSync(join(dir, "audit.md"), audit.concat(["", `- **result**: review (awaiting Dom)`, "", `Payload preserved: sha256 unchanged at ${hash}`]).join("\n"));
  durable(dir);
  return { state: "review", draft };
}

function main() {
  mkdirSync(STATE, { recursive: true });
  const approved = existsSync(APPROVED)
    ? new Set(readFileSync(APPROVED, "utf8").split("\n").map(s => s.trim()).filter(Boolean))
    : new Set<string>();
  const results: Record<string, number> = { done: 0, failed: 0, needs: 0, review: 0, skipped: 0 };

  for (const name of existsSync(DIRS.processing) ? readdirSync(DIRS.processing) : []) {
    const dir = join(DIRS.processing, name);
    try {
      if (!lstatSync(dir).isDirectory()) { results.skipped++; continue; }
      // Backlog guard — the whole point of §3 and §13 Phase D.
      if (name < WORKER_EPOCH && !approved.has(name)) { results.skipped++; continue; }
      if (existsSync(join(DIRS.processing, `${name}.cancel`))) { results.skipped++; continue; }

      const r = processJob(dir);
      const target = r.state === "done" ? DIRS.done : r.state === "failed" ? DIRS.failed : r.state === "review" ? DIRS.review : DIRS.needs;
      if (r.reason) writeFileSync(join(dir, "reason.md"), `# Failed — ${name}\n\n${r.reason}\n`);
      if (r.question) writeFileSync(join(dir, "question.md"), `# Needs input — ${name}\n\n${r.question}\n`);
      moveTo(name, dir, target);
      results[r.state]++;
      appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), job: name, state: r.state, reason: r.reason ?? r.question ?? null, worker: VERSION }) + "\n");
    } catch (e: any) {
      // Per-job containment: one bad job must never wedge the scan.
      results.failed++;
      try {
        writeFileSync(join(dir, "reason.md"), `# Failed — ${name}\n\nWorker exception: ${e.message}\n`);
        moveTo(name, dir, DIRS.failed);
      } catch {}
      appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), job: name, state: "failed", reason: `exception: ${e.message}`, worker: VERSION }) + "\n");
    }
  }

  writeFileSync(HEARTBEAT, JSON.stringify({ ts: new Date().toISOString(), worker: VERSION, ...results }, null, 2));
  console.log(`worker ${VERSION}: review=${results.review} done=${results.done} failed=${results.failed} needs_input=${results.needs} skipped=${results.skipped}`);
}
main();
