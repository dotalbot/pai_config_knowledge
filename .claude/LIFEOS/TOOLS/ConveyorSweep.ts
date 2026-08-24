#!/usr/bin/env bun
/**
 * ConveyorSweep.ts — claim jobs from the conveyor queue.
 *
 * Runs on cron (no systemd user bus on this host, and inotify-tools is absent,
 * so polling is the honest choice rather than the elegant one).
 *
 * What it does: moves each settled job from new/ to processing/, parses the
 * filename grammar and any frontmatter, and appends a claim record that the DA
 * reads. It deliberately does NOT do the work — a cron job should not invoke a
 * model. It makes work visible and claimed; the DA acts on it.
 *
 * Correctness comes from rename(2) being atomic on one filesystem: the move IS
 * the lock. Two sweepers cannot claim the same job.
 */
import { readdirSync, renameSync, statSync, existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ROOT = join(homedir(), "conveyor");
const NEW = join(ROOT, "new");
const PROCESSING = join(ROOT, "processing");
const LOG = join(homedir(), ".claude/LIFEOS/MEMORY/STATE/conveyor.jsonl");

/** A file still being written must not be claimed. Two-phase rsync (.tmp then
 *  rename) is the real guard; this is the backstop for anything copied plainly. */
const SETTLE_MS = 20_000;

const KINDS = ["transcript", "research", "doc", "idea", "task", "ask"] as const;

/** Filename grammar: YYYYMMDD-HHMMSS--<kind>--<slug>.<ext>. Every part optional
 *  — an unparseable name is a job with unknown kind, never an error. */
function parseName(name: string): { kind: string | null; slug: string } {
  const m = name.match(/^\d{8}-\d{6}(?:-[a-z0-9]{4})?--([a-z]+)--(.+?)(\.[^.]+)?$/); // v2 adds -RRRR
  if (m && (KINDS as readonly string[]).includes(m[1])) return { kind: m[1], slug: m[2] };
  return { kind: null, slug: name.replace(/\.[^.]+$/, "") };
}

function frontmatter(path: string): Record<string, string> {
  try {
    if (!/\.(md|markdown|txt)$/i.test(path)) return {};
    const m = readFileSync(path, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return {};
    const out: Record<string, string> = {};
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([a-z_]+):\s*(.+)$/i);
      if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch { return {}; }
}

function main() {
  if (!existsSync(NEW)) return;
  for (const d of [PROCESSING, join(ROOT, "done"), join(ROOT, "failed"), join(ROOT, "needs_input")]) {
    mkdirSync(d, { recursive: true });
  }

  for (const entry of readdirSync(NEW)) {
    if (entry.startsWith(".") || entry.endsWith(".tmp") || entry.endsWith(".part")) continue;

    const src = join(NEW, entry);
    let st;
    try { st = statSync(src); } catch { continue; }
    if (Date.now() - st.mtimeMs < SETTLE_MS) continue; // still landing

    const dest = join(PROCESSING, entry);
    if (existsSync(dest)) continue; // already claimed

    try {
      renameSync(src, dest); // ← the lock
    } catch { continue; }

    // Job directories carry meta.json (the v2 protocol); it outranks everything.
    let meta: Record<string, any> = {};
    try {
      const mj = join(dest, "meta.json");
      if (st.isDirectory() && existsSync(mj)) meta = JSON.parse(readFileSync(mj, "utf8"));
    } catch { /* unreadable meta = job with unknown metadata, never an error */ }
    const fm = st.isDirectory() ? {} : frontmatter(dest);
    const parsed = parseName(entry);
    appendFileSync(LOG, JSON.stringify({
      ts: new Date().toISOString(),
      event: "claimed",
      job: entry,
      kind: meta.kind ?? fm.kind ?? parsed.kind, // meta.json > frontmatter > filename
      kind_source: meta.kind ? "meta.json" : fm.kind ? "frontmatter" : parsed.kind ? "filename" : "unknown",
      project: meta.project ?? fm.project ?? null,
      urgency: meta.urgency ?? fm.urgency ?? "normal",
      output: meta.output ?? fm.output ?? null,
      bytes: st.size,
      dir: st.isDirectory(),
    }) + "\n");
    const k = meta.kind ?? fm.kind ?? parsed.kind;
    console.log(`claimed ${entry}${k ? ` (${k})` : " (kind unknown)"}`);
  }
}

main();
