#!/usr/bin/env bun
/**
 * ============================================================================
 * VaultQuery — read-only retrieval over the Obsidian vault
 * ============================================================================
 *
 * PURPOSE:
 * Given a query string, searches the vault folders declared under `read:` in
 * USER/INTEGRATIONS/obsidian.yaml, ranks matches with the same BM25-lite shape
 * MemoryRetriever uses, and prints compressed excerpts inside a char budget.
 *
 * WHY A SEPARATE TOOL, NOT A MemoryRetriever PATCH:
 * MemoryRetriever owns the KNOWLEDGE corpus, which is LifeOS-managed and
 * schema-linted. The vault is principal-owned, differently shaped, and 1,800
 * notes deep. Keeping them apart means a messy vault can never degrade
 * KNOWLEDGE ranking, and the vault read can be disabled with one config flag.
 *
 * READ-ONLY: this tool opens files and never writes to the vault.
 *
 * USAGE:
 *   bun VaultQuery.ts "query string"           # top matches, compressed
 *   bun VaultQuery.ts "query" --top 5          # override note count
 *   bun VaultQuery.ts --stats                  # corpus size per source
 *   bun VaultQuery.ts "query" --json           # machine-readable
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { parse as parseYaml } from "yaml";

const HOME = process.env.HOME || os.homedir();
const LIFEOS_DIR = process.env.LIFEOS_DIR || path.join(HOME, ".claude", "LIFEOS");
const CONFIG = path.join(LIFEOS_DIR, "USER", "INTEGRATIONS", "obsidian.yaml");

type Source = { dir: string; weight: number; note?: string };
type Limits = { max_notes: number; max_chars_per_note: number; max_total_chars: number };

type Config = {
  vaultPath: string;
  enabled: boolean;
  sources: Source[];
  exclude: string[];
  limits: Limits;
};

function loadConfig(): Config | null {
  if (!existsSync(CONFIG)) return null;
  const raw = parseYaml(readFileSync(CONFIG, "utf8")) ?? {};
  const read = raw.read ?? {};
  if (read.enabled === false) return null;
  const vaultPath = raw.vault?.path;
  if (!vaultPath) return null;
  return {
    vaultPath,
    enabled: read.enabled !== false,
    sources: (read.sources ?? []).map((s: any) => ({
      dir: s.dir,
      weight: typeof s.weight === "number" ? s.weight : 1,
      note: s.note,
    })),
    exclude: read.exclude ?? [],
    limits: {
      max_notes: read.limits?.max_notes ?? 5,
      max_chars_per_note: read.limits?.max_chars_per_note ?? 4000,
      max_total_chars: read.limits?.max_total_chars ?? 15000,
    },
  };
}

/** Walk a directory for markdown, honouring the exclude list. */
function walk(root: string, exclude: string[], vaultRoot: string): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const rec = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.startsWith(".")) continue;
      const full = path.join(dir, e);
      const rel = path.relative(vaultRoot, full);
      if (exclude.some((x) => rel === x || rel.startsWith(x + path.sep))) continue;
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) rec(full);
      // Excalidraw notes are markdown-wrapped JSON blobs: all payload, no prose.
      else if (e.endsWith(".md") && !e.endsWith(".excalidraw.md")) out.push(full);
    }
  };
  rec(root);
  return out;
}

const STOP = new Set(
  ("the a an and or but if then than that this these those of to in on for with as at by from is are was were be been " +
   "it its i you he she they we not no do does did have has had will would can could should").split(" "),
);

const tokenize = (s: string): string[] =>
  s.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g)?.filter((t) => t.length > 2 && !STOP.has(t)) ?? [];

type Note = { file: string; rel: string; source: Source; title: string; isIndex: boolean; body: string; tokens: string[] };

function readNote(file: string, vaultRoot: string, source: Source): Note | null {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  if (!raw.trim()) return null;

  // Strip frontmatter for the body, but keep the title field if present.
  let title = path.basename(file, ".md");
  let body = raw;
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    const t = fm[1].match(/^title:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, "");
    if (t) title = t;
    body = raw.slice(fm[0].length);
  }
  // Index/MOC notes are lists of links, not prose. They match a wide range of
  // queries on title terms alone while answering none of them — a stale index
  // outranked the real note it pointed at during testing (2026-08-20). Demote
  // rather than drop (0.7): a MOC is still the right answer to "what do I have\n  // on X", and 0.4 demoted the AI Tools MOC off a tools query entirely.
  const isIndex = /^type:\s*(index|moc)\s*$/m.test(fm?.[1] ?? "");

  return {
    file,
    rel: path.relative(vaultRoot, file),
    source,
    title,
    isIndex,
    body: body.trim(),
    // Title terms count twice: a note named for the thing you asked about is
    // almost always the note you wanted.
    tokens: [...tokenize(title), ...tokenize(title), ...tokenize(body)],
  };
}

/** BM25-lite: IDF-weighted term frequency with length normalisation. */
function score(notes: Note[], queryTokens: string[]): Map<Note, number> {
  const N = notes.length || 1;
  const avgLen = notes.reduce((a, n) => a + n.tokens.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const q of new Set(queryTokens)) {
    let c = 0;
    for (const n of notes) if (n.tokens.includes(q)) c++;
    df.set(q, c);
  }
  const k1 = 1.5, b = 0.75;
  const scores = new Map<Note, number>();
  for (const n of notes) {
    let s = 0;
    const len = n.tokens.length || 1;
    for (const q of new Set(queryTokens)) {
      const f = n.tokens.filter((t) => t === q).length;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(q) ?? 0) + 0.5) / ((df.get(q) ?? 0) + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (len / avgLen))));
    }
    if (s > 0) scores.set(n, s * n.source.weight * (n.isIndex ? 0.7 : 1));
  }
  return scores;
}

/** Pull the passage around the densest cluster of query terms. */
function excerpt(note: Note, queryTokens: string[], maxChars: number): string {
  const body = note.body;
  if (body.length <= maxChars) return body;
  const qs = new Set(queryTokens);
  const paras = body.split(/\n\n+/);
  let best = 0, bestScore = -1;
  for (let i = 0; i < paras.length; i++) {
    const hits = tokenize(paras[i]).filter((t) => qs.has(t)).length;
    if (hits > bestScore) { bestScore = hits; best = i; }
  }
  let out = "", i = best;
  while (i < paras.length && out.length + paras[i].length < maxChars) {
    out += (out ? "\n\n" : "") + paras[i];
    i++;
  }
  if (!out) out = body.slice(0, maxChars);
  const prefix = best > 0 ? "…\n\n" : "";
  const suffix = i < paras.length ? "\n\n…" : "";
  return prefix + out + suffix;
}

// ── main ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const wantJson = argv.includes("--json");
const wantStats = argv.includes("--stats");
const topIdx = argv.indexOf("--top");
const topOverride = topIdx >= 0 ? parseInt(argv[topIdx + 1], 10) : NaN;
const query = argv.filter((a, i) => !a.startsWith("--") && !(topIdx >= 0 && i === topIdx + 1)).join(" ").trim();

const cfg = loadConfig();
if (!cfg) {
  console.error("Vault read path disabled or unconfigured (USER/INTEGRATIONS/obsidian.yaml → read.enabled).");
  process.exit(1);
}
if (!existsSync(cfg.vaultPath)) {
  console.error(`Vault not found at ${cfg.vaultPath}`);
  process.exit(1);
}

const notes: Note[] = [];
const perSource = new Map<string, number>();
for (const src of cfg.sources) {
  const root = path.join(cfg.vaultPath, src.dir);
  const files = walk(root, cfg.exclude, cfg.vaultPath);
  perSource.set(src.dir, files.length);
  for (const f of files) {
    const n = readNote(f, cfg.vaultPath, src);
    if (n) notes.push(n);
  }
}

if (wantStats) {
  console.log(`Vault: ${cfg.vaultPath}`);
  console.log(`Readable notes: ${notes.length}\n`);
  for (const src of cfg.sources) {
    console.log(`  ${src.dir.padEnd(14)} ${String(perSource.get(src.dir) ?? 0).padStart(5)} notes  (weight ${src.weight})`);
    if (src.note) console.log(`  ${" ".repeat(14)}   ${src.note}`);
  }
  console.log(`\nExcluded: ${cfg.exclude.join(", ")}`);
  process.exit(0);
}

if (!query) {
  console.error('Usage: bun VaultQuery.ts "query string" [--top N] [--json] [--stats]');
  process.exit(1);
}

const qTokens = tokenize(query);
const ranked = [...score(notes, qTokens).entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, Number.isFinite(topOverride) ? topOverride : cfg.limits.max_notes);

if (!ranked.length) {
  if (wantJson) console.log(JSON.stringify({ query, results: [] }, null, 2));
  else console.log(`No vault matches for "${query}".`);
  process.exit(0);
}

let budget = cfg.limits.max_total_chars;
const results = ranked.map(([n, s]) => {
  const allowance = Math.min(cfg.limits.max_chars_per_note, Math.max(0, budget));
  const text = allowance > 0 ? excerpt(n, qTokens, allowance) : "";
  budget -= text.length;
  return { title: n.title, path: n.rel, score: Number(s.toFixed(2)), excerpt: text };
}).filter((r) => r.excerpt);

if (wantJson) {
  console.log(JSON.stringify({ query, vault: cfg.vaultPath, results }, null, 2));
} else {
  console.log(`## Vault context — "${query}"\n`);
  for (const r of results) {
    console.log(`### ${r.title}`);
    console.log(`\`${r.path}\`  ·  score ${r.score}\n`);
    console.log(r.excerpt);
    console.log("\n---\n");
  }
  console.log(`_${results.length} note(s), read-only from ${cfg.vaultPath}_`);
}
