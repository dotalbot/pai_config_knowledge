#!/usr/bin/env bun
/**
 * Reads the vault's existing tag vocabulary so captures reuse tags rather than
 * minting near-duplicates (AC-1.4).
 *
 * This is the mechanism surfacing depends on. If a capture in September is
 * tagged `systems-thinking` and one in November `systemsthinking`, the two never
 * surface together and the reference layer quietly fails at its only job.
 *
 * Measured 2026-09-07 against the live vault: 248 distinct tags already carrying
 * 4 collision pairs (ai/AI, devops/Devops, microsoft-365/microsoft365,
 * people/People). The problem is real before this skill adds to it.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const VAULT = process.env.OBSIDIAN_VAULT ?? join(process.env.HOME ?? "", "obsidian");

/** Folders with no bearing on subject vocabulary. */
const SKIP_DIRS = new Set([".obsidian", ".trash", "Attachments", "Excalidraw", "node_modules"]);

/** Structural tags that describe note plumbing, not subject matter. */
const STRUCTURAL = new Set([
  "pai", "jellypai", "session", "excalidraw", "moc", "index", "inbox", "todo",
  "note", "fleeting", "source", "capture", "reference", "anchor", "draft",
]);

/** Canonical form used for collision detection: case- and separator-insensitive. */
export function normalise(tag: string): string {
  return tag.toLowerCase().replace(/[-_\s]/g, "");
}

/** Tidy a raw frontmatter tag token into a usable tag. */
function clean(raw: string): string | undefined {
  const t = raw.trim().replace(/^["'#]+/, "").replace(/["']+$/, "").trim();
  if (!t || t.length > 40) return undefined;
  if (t.includes("/")) return undefined;      // path-like, not a subject tag
  if (/^\[+/.test(t)) return undefined;        // malformed wikilink spill
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(t)) return undefined;
  return t;
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(join(dir, e.name));
    } else if (e.name.endsWith(".md")) {
      yield join(dir, e.name);
    }
  }
}

export interface Vocabulary {
  /** tag -> how many notes use it. */
  counts: Map<string, number>;
  /** normalised form -> the winning spelling (most used). */
  canonical: Map<string, string>;
}

export async function buildVocabulary(vault = VAULT): Promise<Vocabulary> {
  const counts = new Map<string, number>();

  for await (const file of walk(vault)) {
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (!content.startsWith("---")) continue;
    const end = content.indexOf("\n---", 3);
    if (end === -1) continue;
    const fm = content.slice(0, end);

    // Inline form: tags: [a, b, c]
    const inline = fm.match(/^tags:\s*\[([^\]]*)\]/m);
    let raw: string[] = [];
    if (inline?.[1]) {
      raw = inline[1].split(",");
    } else {
      // Block form: tags:\n  - a\n  - b
      const block = fm.match(/^tags:\s*\n((?:\s+-\s+.*\n?)+)/m);
      if (block?.[1]) raw = block[1].split("\n").map((l) => l.replace(/^\s*-\s*/, ""));
    }

    for (const r of raw) {
      const t = clean(r);
      if (!t) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  // Winning spelling per normalised form: most-used, ties broken by hyphenated
  // then alphabetical, so the choice is deterministic across runs.
  const groups = new Map<string, string[]>();
  for (const tag of counts.keys()) {
    const n = normalise(tag);
    groups.set(n, [...(groups.get(n) ?? []), tag]);
  }
  const canonical = new Map<string, string>();
  for (const [n, variants] of groups) {
    variants.sort((a, b) => {
      const d = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
      if (d !== 0) return d;
      // Ties: prefer lowercase (the vault's dominant convention), then
      // hyphenated, then alphabetical — so the winner is deterministic.
      const al = a === a.toLowerCase() ? 0 : 1;
      const bl = b === b.toLowerCase() ? 0 : 1;
      if (al !== bl) return al - bl;
      const ah = a.includes("-") ? 0 : 1;
      const bh = b.includes("-") ? 0 : 1;
      if (ah !== bh) return ah - bh;
      return a.localeCompare(b);
    });
    canonical.set(n, variants[0]!);
  }

  return { counts, canonical };
}

/**
 * Map a proposed tag onto the vault's existing vocabulary where one matches.
 * Returns the canonical spelling, or the cleaned proposal if genuinely new.
 */
export function reconcile(proposed: string, vocab: Vocabulary): string {
  const t = clean(proposed) ?? proposed.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return vocab.canonical.get(normalise(t)) ?? t.toLowerCase();
}

/** Subject-bearing tags, most used first — the menu offered at capture time. */
export function subjectTags(vocab: Vocabulary, limit = 150): string[] {
  return [...vocab.counts.entries()]
    .filter(([t]) => !STRUCTURAL.has(t.toLowerCase()))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}

if (import.meta.main) {
  const vocab = await buildVocabulary();
  const collisions = [...vocab.canonical.entries()]
    .map(([n, win]) => {
      const variants = [...vocab.counts.keys()].filter((t) => normalise(t) === n);
      return variants.length > 1 ? { winner: win, variants } : undefined;
    })
    .filter(Boolean);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ tags: subjectTags(vocab), collisions }, null, 2));
  } else {
    console.log(`distinct tags: ${vocab.counts.size}`);
    console.log(`collision groups: ${collisions.length}`);
    for (const c of collisions) console.log(`  ${c!.variants.join(" | ")} -> ${c!.winner}`);
    console.log(`\ntop subject tags:\n  ${subjectTags(vocab, 30).join(", ")}`);
  }
}
