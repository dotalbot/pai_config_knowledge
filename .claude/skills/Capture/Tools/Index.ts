#!/usr/bin/env bun
/**
 * The reference index (US-8, US-10).
 *
 * A rebuildable CACHE, never a source of truth: every field is derivable from
 * the frontmatter of notes under Reference/. It lives outside the vault because
 * it is machinery, not a note — inside, it would sync to the Mac, appear in
 * search results, and Obsidian would try to render it.
 *
 * Writes are atomic (temp + rename) so an interrupted capture cannot corrupt it
 * (AC-10.5).
 */

import { readdir, readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
import type { CaptureKind, IndexEntry, Medium, AnchorMedium, ReferenceIndex, ItemStatus } from "./types.ts";
import { emptyIndex } from "./types.ts";
import { VAULT } from "./TagVocabulary.ts";

export const REFERENCE_DIR = join(VAULT, "Reference");
export const INDEX_PATH =
  process.env.CAPTURE_INDEX ??
  join(process.env.HOME ?? "", ".claude", "LIFEOS", "MEMORY", "reference-index.json");

export async function loadIndex(path = INDEX_PATH): Promise<ReferenceIndex> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as ReferenceIndex;
    if (!Array.isArray(parsed.entries)) return emptyIndex();
    return parsed;
  } catch {
    return emptyIndex();
  }
}

/** Atomic write: a crash mid-write leaves the previous index intact. */
export async function saveIndex(index: ReferenceIndex, path = INDEX_PATH): Promise<void> {
  index.updated = new Date().toISOString();
  await mkdir(join(path, ".."), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(index, null, 2), "utf8");
  await rename(tmp, path);
}

// ---------------------------------------------------------------- frontmatter

function scalar(fm: string, key: string): string | undefined {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!m) return undefined;
  const v = m[1]!.trim().replace(/^["']|["']$/g, "").trim();
  return v && v !== "null" ? v : undefined;
}

function list(fm: string, key: string): string[] {
  const inline = fm.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, "m"));
  if (inline?.[1] !== undefined) {
    return inline[1].split(",").map((t) => t.trim().replace(/^["'#]|["']$/g, "")).filter(Boolean);
  }
  const block = fm.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.*\\n?)+)`, "m"));
  if (block?.[1]) {
    return block[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim().replace(/^["'#]|["']$/g, "")).filter(Boolean);
  }
  return [];
}

/** First paragraph after the frontmatter and any breadcrumb, as the summary. */
function firstProse(body: string): string {
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t) continue;
    if (t.startsWith("⬆️") || t.startsWith("#") || t.startsWith(">") || t.startsWith("<!--")) continue;
    if (t.startsWith("-") || t.startsWith("*")) continue;
    return t.replace(/\s+/g, " ").slice(0, 400);
  }
  return "";
}

export function parseNote(content: string, path: string): IndexEntry | undefined {
  if (!content.startsWith("---")) return undefined;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return undefined;
  const fm = content.slice(3, end);
  const body = content.slice(end + 4);

  const type = scalar(fm, "type");
  if (type !== "reference" && type !== "anchor") return undefined;

  const kind = scalar(fm, "kind") as CaptureKind | undefined;
  if (!kind) return undefined;

  return {
    path,
    title: scalar(fm, "title") ?? path.split("/").pop()!.replace(/\.md$/, ""),
    kind,
    medium: (scalar(fm, "medium") ?? "web") as Medium | AnchorMedium,
    url: scalar(fm, "url"),
    author: scalar(fm, "author"),
    source: scalar(fm, "channel") ?? scalar(fm, "site"),
    tags: list(fm, "tags"),
    summary: scalar(fm, "summary") ?? firstProse(body),
    captured: scalar(fm, "captured") ?? scalar(fm, "date") ?? "",
    status: (scalar(fm, "status") ?? "captured") as ItemStatus,
  };
}

async function* walkRef(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkRef(p);
    else if (e.name.endsWith(".md") && e.name !== "README.md") yield p;
  }
}

/**
 * Rebuild the whole index from note frontmatter (AC-10.1..10.4).
 * Idempotent, and entries whose file has gone simply do not reappear.
 * Sleep state is preserved: it is runtime state, not derived from notes.
 */
export async function rebuild(
  refDir = REFERENCE_DIR,
  vault = VAULT,
  previous?: ReferenceIndex,
): Promise<ReferenceIndex> {
  const entries: IndexEntry[] = [];
  for await (const file of walkRef(refDir)) {
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    const entry = parseNote(content, relative(vault, file));
    if (entry) entries.push(entry);
  }
  entries.sort((a, b) => (b.captured ?? "").localeCompare(a.captured ?? "") || a.path.localeCompare(b.path));
  const index = emptyIndex();
  index.entries = entries;
  if (previous?.sleep) index.sleep = previous.sleep;
  return index;
}

/** Insert or replace one entry without a full rebuild. */
export function upsert(index: ReferenceIndex, entry: IndexEntry): ReferenceIndex {
  const rest = index.entries.filter((e) => e.path !== entry.path);
  index.entries = [entry, ...rest].sort(
    (a, b) => (b.captured ?? "").localeCompare(a.captured ?? "") || a.path.localeCompare(b.path),
  );
  return index;
}

// --------------------------------------------------------------------- sleep

export function isAsleep(index: ReferenceIndex, now = new Date()): boolean {
  if (!index.sleep) return false;
  return new Date(index.sleep.until).getTime() > now.getTime();
}

/** Accepts 30m, 2h, 1d, 1w. */
export function parseDuration(input: string): number | undefined {
  const m = input.trim().match(/^(\d+)\s*(m|min|mins|h|hr|hrs|d|day|days|w|week|weeks)$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2]!.toLowerCase();
  if (unit.startsWith("m")) return n * 60_000;
  if (unit.startsWith("h")) return n * 3_600_000;
  if (unit.startsWith("d")) return n * 86_400_000;
  return n * 604_800_000;
}

if (import.meta.main) {
  const cmd = process.argv[2];
  if (cmd === "rebuild") {
    const prev = await loadIndex();
    const index = await rebuild(REFERENCE_DIR, VAULT, prev);
    await saveIndex(index);
    console.log(`rebuilt: ${index.entries.length} entries -> ${INDEX_PATH}`);
  } else if (cmd === "stats") {
    const index = await loadIndex();
    const byKind = new Map<string, number>();
    for (const e of index.entries) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
    console.log(`entries: ${index.entries.length}`);
    console.log(`asleep: ${isAsleep(index)}`);
    for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);
  } else {
    console.log("usage: Index.ts rebuild|stats");
  }
}
