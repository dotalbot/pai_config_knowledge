#!/usr/bin/env bun
/**
 * ConveyorWorker.ts — process jobs the sweeper has claimed into processing/.
 *
 * Spec: "ConveyorDesk → LifeOS Automatic Processing Worker" (2026-08-27).
 *
 * Every claimed job reaches exactly one terminal state (done/review/failed/
 * needs_input), preserves its payload byte-for-byte, and leaves an audit trail.
 * One malformed or hostile job must never block the others.
 *
 * OUTPUT CONTAINMENT (1.1.1). `output: local` writes NOTHING beneath the vault
 * and ends at done/. `output: vault` publishes one pinned draft to 00 INBOX via
 * an atomic no-replace link and ends at review/; ConveyorPublish alone moves it
 * to its final destination. inventory.vault_writes is authoritative and must
 * never be empty when a file was written under the vault.
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
  linkSync, unlinkSync, writeSync, realpathSync,
} from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const VERSION = "1.1.1";

/**
 * HOME is read once, here, so an isolated test can point the whole worker at a
 * fixture tree. Never call homedir() below this line.
 */
const HOME = process.env.CONVEYOR_HOME ?? homedir();
const ROOT = join(HOME, "conveyor");

/** Worker-owned temp prefix. Cleanup only ever touches files matching this. */
const TMP_PREFIX = ".conveyor-worker-";
/** A temp older than this is debris from a crashed run (addendum 2 §D). */
const STALE_TMP_MS = 60 * 60 * 1000;
/** Bounded write chunk; also lets a test force short writes. */
const CHUNK = Number(process.env.CONVEYOR_WRITE_CHUNK ?? 1 << 20);

/**
 * Fault-injection seam. Inert unless CONVEYOR_FAULT names a point, so the
 * crash/failure paths required by review are executable rather than described.
 */
function FAULT(point: string) {
  if (process.env.CONVEYOR_FAULT !== point) return;
  // A crash is a process death, not an exception: throwing here would be
  // swallowed by the per-job handler and mis-recorded as a failed job. The
  // whole point of these seams is to leave the on-disk state a real crash
  // leaves, so the next run's recovery path is what gets tested.
  if (point.startsWith("after_link") || point.startsWith("after_temp")) {
    throw new Error(`injected fault at ${point}`);   // cleanup-path: recoverable
  }
  process.exit(137);                                 // crash-path: hard exit
}
const DIRS = {
  processing: join(ROOT, "processing"), done: join(ROOT, "done"),
  failed: join(ROOT, "failed"), needs: join(ROOT, "needs_input"),
  review: join(ROOT, "review"),
};
const STATE = join(HOME, ".claude/LIFEOS/MEMORY/STATE");
const HEARTBEAT = join(STATE, "conveyor-worker-heartbeat.json");
const LOG = join(STATE, "conveyor-worker.jsonl");
const APPROVED = join(ROOT, "approved-backlog.txt");

/** Jobs claimed before this are backlog; they need explicit approval. */
const WORKER_EPOCH = "20260827-140000";
const MAX_META = 64 * 1024;
const MAX_EXTRACT = 2 * 1024 * 1024;
/** meta.context is user-typed free text from ConveyorDesk (addendum 2 §C). */
const MAX_CONTEXT = 4 * 1024;
const KINDS = new Set(["transcript", "research", "doc", "idea", "task", "ask", "unknown"]);
const JOBID = /^\d{8}-\d{6}-[a-z0-9]{4}--[a-z]+--[a-z0-9-]+$/;

type Outcome = { state: "done" | "failed" | "needs" | "review"; reason?: string; question?: string; draft?: string };

const VAULT = join(HOME, "obsidian");
const INBOX = join(VAULT, "00 INBOX");

const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const isLink = (p: string) => { try { return lstatSync(p).isSymbolicLink(); } catch { return true; } };

/** fsync a file, then its directory, so a terminal move never outruns its data. */
function durable(path: string) {
  for (const p of [path, join(path, "..")]) {
    try { const fd = openSync(p, "r"); fsyncSync(fd); closeSync(fd); } catch {}
  }
}

/**
 * fsync that THROWS. `durable()` swallows errors, which is tolerable for
 * best-effort flushes but not for the draft transaction: §2's ordering is only
 * meaningful if the sync actually happened. A silent failure there would let
 * the worker believe it had committed bytes it had not.
 */
function fsyncStrict(path: string) {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

/** Outcome of reconciling the pinned INBOX draft (addendum §1 A/B/C). */
type DraftOutcome =
  | { kind: "created"; path: string; sha256: string; cleanup?: string[] }
  | { kind: "existing_identical"; path: string; sha256: string }
  | { kind: "existing_modified_preserved"; path: string; sha256: string }
  | { kind: "collision"; reason: string };

/** Read `conveyor_job` from a draft's frontmatter, bounded. Null if absent. */
function draftJobId(path: string): string | null {
  let raw: string;
  try { raw = readFileSync(path, "utf8").slice(0, MAX_META); } catch { return null; }
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const m = raw.slice(0, end).match(/^conveyor_job:\s*(\S+)\s*$/m);
  return m ? m[1] : null;
}

/**
 * Remove this worker's own stale temporaries from INBOX. Deliberately narrow
 * (addendum §2): prefix match, job id, direct child, regular non-symlink, owned
 * by us, older than the threshold, and never the live temp for this run.
 * An unrelated .tmp file is not ours and is never touched.
 */
function sweepStaleTemps(inbox: string, jobid: string, active: string | null) {
  let names: string[];
  try { names = readdirSync(inbox); } catch { return; }
  const uid = typeof process.getuid === "function" ? process.getuid() : -1;
  for (const n of names) {
    if (!n.startsWith(TMP_PREFIX) || !n.includes(jobid)) continue;
    const full = join(inbox, n);
    if (active && full === active) continue;
    try {
      const st = lstatSync(full);
      if (!st.isFile() || st.isSymbolicLink()) continue;
      if (uid !== -1 && st.uid !== uid) continue;
      if (Date.now() - st.mtimeMs < STALE_TMP_MS) continue;
      unlinkSync(full);
    } catch { /* a temp we cannot stat or remove is left alone, never fatal */ }
  }
}

/**
 * Publish the pinned draft with an exclusive, no-replace transaction.
 *
 * POSIX rename() REPLACES its destination, so it can never be used here — that
 * is precisely the overwrite this fix exists to prevent. link() fails EEXIST
 * instead, which is the primitive we want. Verified on ext4 (the vault's fs).
 *
 * EEXIST is the reconciliation path. EPERM/EOPNOTSUPP/EXDEV mean the filesystem
 * cannot give us no-replace semantics at all, and we fail closed rather than
 * degrade to a replacing write.
 */
function publishDraft(inbox: string, finalPath: string, bytes: string, jobid: string): DraftOutcome {
  mkdirSync(inbox, { recursive: true });
  sweepStaleTemps(inbox, jobid, null);

  const tmp = join(inbox, `${TMP_PREFIX}${jobid}.${process.pid}.tmp`);
  // wx = exclusive create, 0600. Never follows an existing entry.
  let fd: number;
  try { fd = openSync(tmp, "wx", 0o600); }
  catch (e: any) { return { kind: "collision", reason: `could not create worker temp: ${e.code ?? e.message}` }; }
  try {
    // writeSync may write fewer bytes than asked. Loop on the returned count;
    // zero progress is a hard failure, never a silently truncated draft.
    const buf = Buffer.from(bytes, "utf8");
    let off = 0;
    while (off < buf.length) {
      const n = writeSync(fd, buf, off, Math.min(CHUNK, buf.length - off), null);
      if (!(n > 0)) throw new Error(`write made no progress at byte ${off}/${buf.length}`);
      off += n;
    }
    fsyncSync(fd);
  } catch (e: any) {
    closeSync(fd);
    try { unlinkSync(tmp); } catch {}
    return { kind: "collision", reason: `draft temp write failed: ${e.message}` };
  }
  closeSync(fd);
  FAULT("after_temp_write");

  // The link is the visibility commit. Everything after it is cleanup, and a
  // cleanup failure must never be reported as "no draft was created" — the
  // draft IS there, and saying otherwise would make inventory lie (finding 1).
  try {
    linkSync(tmp, finalPath);          // atomic, no-replace
  } catch (e: any) {
    const code = e.code;
    try { unlinkSync(tmp); } catch {}
    if (code !== "EEXIST") {
      // No no-replace primitive available: fail closed, never fall back.
      return { kind: "collision", reason: `atomic no-replace link unavailable (${code ?? "unknown"}) — refusing to publish` };
    }
    return reconcileExisting(finalPath, bytes, jobid);
  }

  // Committed. Cleanup is best-effort and is reported, never fatal.
  const cleanup: string[] = [];
  try { FAULT("after_link"); fsyncStrict(inbox); } catch (e: any) { cleanup.push(`inbox fsync after link: ${e.code ?? e.message}`); }
  try { FAULT("after_link_fsync"); unlinkSync(tmp); } catch (e: any) { cleanup.push(`temp unlink: ${e.code ?? e.message}`); }
  try { FAULT("after_temp_unlink"); fsyncStrict(inbox); } catch (e: any) { cleanup.push(`inbox fsync after cleanup: ${e.code ?? e.message}`); }

  // Record the hash actually observed on the final path, not the generated one.
  let observed: string;
  try { observed = sha256(finalPath); }
  catch (e: any) { observed = `unreadable: ${e.code ?? e.message}`; }
  return { kind: "created", path: finalPath, sha256: observed, cleanup: cleanup.length ? cleanup : undefined };
}

/** The final path already exists. Decide A / B / C without ever writing to it. */
function reconcileExisting(finalPath: string, bytes: string, jobid: string): DraftOutcome {
  let st;
  try { st = lstatSync(finalPath); } catch (e: any) { return { kind: "collision", reason: `existing draft could not be inspected: ${e.code ?? e.message}` }; }
  if (st.isSymbolicLink()) return { kind: "collision", reason: "existing draft path is a symlink" };
  if (!st.isFile()) return { kind: "collision", reason: "existing draft path is not a regular file" };

  const owner = draftJobId(finalPath);
  if (owner === null) return { kind: "collision", reason: "existing draft has no parseable conveyor_job frontmatter" };
  if (owner !== jobid) return { kind: "collision", reason: "existing draft belongs to a different conveyor job" };

  const observed = sha256(finalPath);
  const generated = createHash("sha256").update(bytes).digest("hex");
  // A: byte-identical — an idempotent republication of our own prior draft.
  if (observed === generated) return { kind: "existing_identical", path: finalPath, sha256: observed };
  // B: same job, different bytes — Dom edited or unpinned it. Never overwrite.
  return { kind: "existing_modified_preserved", path: finalPath, sha256: observed };
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

/**
 * Build the draft bytes. PURE: a function of (jobid, kind, meta, text, facts)
 * and nothing else.
 *
 * Addendum 2 §B — this purity is load-bearing. Case A ("existing identical")
 * compares generated bytes against the file on disk, so any clock- or
 * environment-derived value here would make a next-day retry look like a user
 * edit and permanently defeat idempotency. `date` is therefore derived from the
 * job, never from now(). Do not introduce new(Date), random, hostname, or env
 * into this function.
 */
function draftBytes(jobid: string, kind: string, meta: any, text: string, facts: string[]): string {
  const r = RECIPES[kind] ?? RECIPES.unknown;
  const slug = draftSlug(jobid);
  const head = text.trim().split("\n").filter(l => l.trim()).slice(0, 12).join("\n");
  const body = [
    "---",
    `status: pinned`,                      // router leaves it alone; removing this publishes
    `conveyor_job: ${jobid}`,              // the discriminator — publisher touches nothing else
    `recipe: ${kind}`,
    `destination: ${r.dest}`,
    `stage2_needs_model: ${r.stage2}`,
    `date: ${jobDate(jobid, meta)}`,
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
  return body;
}

/** The draft's slug, and the deterministic final INBOX path built from it. */
const draftSlug = (jobid: string) => jobid.split("--").slice(2).join("--") || jobid;
const draftPath = (inbox: string, jobid: string) => join(inbox, `DRAFT — ${draftSlug(jobid)}.md`);

/**
 * A date that depends only on the job. Prefers the sender's declared drop time,
 * falls back to the job id's own YYYYMMDD prefix. Never the wall clock.
 */
function jobDate(jobid: string, meta: any): string {
  const dropped = meta?.source?.dropped_at;
  if (typeof dropped === "string" && /^\d{4}-\d{2}-\d{2}/.test(dropped)) return dropped.slice(0, 10);
  const m = jobid.match(/^(\d{4})(\d{2})(\d{2})-/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "unknown";
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

  /*
   * Addendum 2 §C — meta.context is user-typed free text from the ConveyorDesk
   * UI. The gates above test the PAYLOAD extraction only, so context reached
   * the vault entirely ungated. Scan it here, before any draft bytes exist and
   * before the publication transaction opens. Unsafe context is never
   * reproduced — not in question.md, audit.md, the log, or the draft.
   */
  const rawCtx = meta.context == null ? "" : String(meta.context);
  let ctxNote = "No sender context given";
  if (rawCtx) {
    if (Buffer.byteLength(rawCtx, "utf8") > MAX_CONTEXT)
      return { state: "needs", question: `Sender context exceeds the ${MAX_CONTEXT}-byte bound. Not reproduced here. Shorten it and resubmit.` };
    if (SECRET.test(rawCtx))
      return { state: "needs", question: "Credential-shaped content detected in the sender context. Stopped before any draft was written. Content not reproduced here or in any log." };
    if (INJECTION.test(rawCtx))
      return { state: "needs", question: "Sender context contains instruction-shaped text aimed at changing agent behaviour. Treated as data, not obeyed. No draft was written." };
    ctxNote = `Sender context: *${rawCtx.slice(0, 200)}*`;
    add("context", `scanned · ${Buffer.byteLength(rawCtx, "utf8")} B · secret clear · injection clear`);
  } else {
    add("context", "none given");
  }
  const contextScanned = true;   // the gate above ran to completion (finding 3)

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
    vault_writes: [] as any[],
    context_scanned: contextScanned,
  };
  add("output policy", output === "vault"
    ? "vault declared — a pinned draft is published to 00 INBOX for review; publication to its final destination remains ConveyorPublish's act"
    : "local — nothing is written outside the job directory");

  // Addendum 2 §B — the stage-1 draft is job-local for EVERY policy. On the
  // vault path it is additionally published to INBOX below.
  const facts = [
    `**${basename(payload)}** · ${size.toLocaleString()} bytes · ${mime}`,
    `Extracted with **${how}** — ${chars.toLocaleString()} characters`,
    `Declared by: \`${declared.original_name ?? "?"}\``,
    `Safety gates: secret clear, injection clear`,
    ctxNote,
  ];
  const bytes = draftBytes(jobid, kind, meta, text, facts);
  try { writeFileSync(join(dir, "stage1-draft.md"), bytes); }
  catch (e: any) { return { state: "failed", reason: `stage-1 draft write failed: ${e.message}` }; }
  inv.files.push({ name: "stage1-draft.md", role: "deterministic stage-1 draft", sha256: sha256(join(dir, "stage1-draft.md")) });

  // §5 — output: local ends here. done/, and nothing under the vault.
  if (output !== "vault") {
    inv.vault_writes = [];
    writeFileSync(join(dir, "inventory.json"), JSON.stringify(inv, null, 2));
    add("draft", "stage1-draft.md written inside the job directory; no vault write");
    add("result", "done — local output, nothing written outside the job directory");
    writeFileSync(join(dir, "audit.md"), audit.concat(["", `Payload preserved: sha256 unchanged at ${hash}`]).join("\n"));
    durable(dir);
    return { state: "done" };
  }

  // §6 — output: vault. Publish the pinned draft, then hand off to review/.
  const finalPath = draftPath(INBOX, jobid);
  const pub = publishDraft(INBOX, finalPath, bytes, jobid);
  if (pub.kind === "collision") {
    // Fail closed (addendum §1 C). The existing INBOX file is never modified.
    return { state: "needs", question: `Draft publication stopped: ${pub.reason}. The job and its payload are retained; nothing in 00 INBOX was modified.` };
  }
  FAULT("after_draft_visible");   // crash test A: draft exists, inventory not yet written
  inv.vault_writes = [{
    path: finalPath,
    outcome: pub.kind,
    sha256: pub.sha256,
    observed_at: new Date().toISOString(),
    role: "pinned_review_draft",
  }];
  writeFileSync(join(dir, "inventory.json"), JSON.stringify(inv, null, 2));
  add("draft", pub.kind === "created"
    ? `pinned draft published to 00 INBOX (${basename(finalPath)})`
    : pub.kind === "existing_identical"
      ? "identical draft already in 00 INBOX — treated as an idempotent republication, not rewritten"
      : "an existing modified draft was found in 00 INBOX and preserved byte-for-byte");
  add("result", "review — awaiting Dom's unpin");
  if (pub.cleanup) add("cleanup", `draft is published; non-fatal cleanup issues: ${pub.cleanup.join("; ")}`);
  writeFileSync(join(dir, "audit.md"), audit.concat(["", `Payload preserved: sha256 unchanged at ${hash}`]).join("\n"));
  durable(dir);
  FAULT("after_reconcile");       // crash test B: inventory written, rename not yet done
  return { state: "review", draft: finalPath };
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
