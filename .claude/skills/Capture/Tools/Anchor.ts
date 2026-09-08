#!/usr/bin/env bun
/**
 * Anchor maintenance (US-3, US-4, decision D3).
 *
 * Anchors are EARNED: created on explicit request, or when the third item from
 * one source arrives. Below that, items stand alone and record their origin in
 * frontmatter. Without the threshold, one saved blog post would mint a near-empty
 * domain stub nobody asked for.
 *
 * Child lists are REGENERATED from child-note frontmatter, never incrementally
 * appended. This follows the repo's generated-artefact convention
 * (ARCHITECTURE_SUMMARY, PRINCIPAL_TELOS): a derived view rebuilt from its source
 * is correct by construction and self-heals after hand edits. Content outside the
 * fence markers is preserved.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { IndexEntry, ReferenceIndex } from "./types.ts";
import { ANCHOR_THRESHOLD, GEN_START, GEN_END } from "./types.ts";
import { VAULT } from "./TagVocabulary.ts";

export const ANCHOR_FOLDER = { youtube: "Channels", site: "Sites" } as const;

/** Filesystem-safe note name, preserving readability. */
export function safeName(title: string): string {
  return title
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 120);
}

export interface AnchorTarget {
  kind: "youtube" | "site";
  /** Channel name or site domain. */
  source: string;
}

export function anchorPath(target: AnchorTarget): string {
  return join("Reference", ANCHOR_FOLDER[target.kind], `${safeName(target.source)}.md`);
}

/** Items belonging to a source, excluding anchors themselves. */
export function childrenOf(index: ReferenceIndex, source: string): IndexEntry[] {
  const key = source.toLowerCase();
  return index.entries
    .filter((e) => e.kind !== "channel" && e.kind !== "site")
    .filter((e) => (e.source ?? "").toLowerCase() === key)
    .sort((a, b) => (b.captured ?? "").localeCompare(a.captured ?? "") || a.title.localeCompare(b.title));
}

/**
 * Has this source earned an anchor? Explicit request always wins; otherwise the
 * Nth item triggers it.
 */
export function hasEarnedAnchor(
  index: ReferenceIndex,
  source: string,
  explicit = false,
): boolean {
  if (explicit) return true;
  return childrenOf(index, source).length >= ANCHOR_THRESHOLD;
}

export function anchorExists(index: ReferenceIndex, source: string): boolean {
  const key = source.toLowerCase();
  return index.entries.some(
    (e) => (e.kind === "channel" || e.kind === "site") && e.title.toLowerCase() === key,
  );
}

/** The generated block body — pure function, easy to test. */
export function renderChildList(children: IndexEntry[]): string {
  if (children.length === 0) return "_Nothing captured from this source yet._";
  return children
    .map((c) => {
      const name = c.path.split("/").pop()!.replace(/\.md$/, "");
      const when = c.captured ? ` — captured ${c.captured.slice(0, 10)}` : "";
      return `- [[${name}]]${when}`;
    })
    .join("\n");
}

/**
 * Replace only the fenced region. Everything outside the markers survives
 * untouched (AC-3.6). If the markers are absent, the block is appended under the
 * expected heading, or at the end.
 */
export function spliceGenerated(content: string, heading: string, generated: string): string {
  const block = `${GEN_START}\n${generated}\n${GEN_END}`;
  const start = content.indexOf(GEN_START);
  const end = content.indexOf(GEN_END);

  if (start !== -1 && end !== -1 && end > start) {
    return content.slice(0, start) + block + content.slice(end + GEN_END.length);
  }

  const headingRe = new RegExp(`^## ${heading}\\s*$`, "m");
  const hm = content.match(headingRe);
  if (hm?.index !== undefined) {
    const after = hm.index + hm[0].length;
    return `${content.slice(0, after)}\n\n${block}\n${content.slice(after)}`;
  }

  const sep = content.endsWith("\n") ? "" : "\n";
  return `${content}${sep}\n## ${heading}\n\n${block}\n`;
}

function anchorScaffold(target: AnchorTarget, heading: string, today: string): string {
  const mediumLine = target.kind === "youtube" ? "medium: youtube" : "medium: site";
  return `---
title: ${target.source}
type: anchor
kind: ${target.kind === "youtube" ? "channel" : "site"}
${mediumLine}
captured: ${today}
status: captured
tags: [reference, anchor]
---

⬆️:: [[Reference/README|Reference]]

# ${target.source}

_Description pending — what this source covers and its typical format._

## ${heading}

${GEN_START}
${GEN_END}
`;
}

/**
 * Regenerate one anchor's child list from the index. Idempotent: running twice
 * with no new captures yields a byte-identical file (AC-3.8).
 */
export async function regenerateAnchor(
  index: ReferenceIndex,
  target: AnchorTarget,
  vault = VAULT,
): Promise<{ path: string; count: number; created: boolean }> {
  const rel = anchorPath(target);
  const abs = join(vault, rel);
  const heading = target.kind === "youtube" ? "Videos" : "Articles";

  let content: string;
  let created = false;
  try {
    content = await readFile(abs, "utf8");
  } catch {
    content = anchorScaffold(target, heading, new Date().toISOString().slice(0, 10));
    created = true;
  }

  const children = childrenOf(index, target.source);
  const next = spliceGenerated(content, heading, renderChildList(children));

  if (next !== content || created) {
    await mkdir(join(abs, ".."), { recursive: true });
    await writeFile(abs, next, "utf8");
  }
  return { path: rel, count: children.length, created };
}

if (import.meta.main) {
  const { loadIndex } = await import("./Index.ts");
  const kind = process.argv[2] as "youtube" | "site";
  const source = process.argv.slice(3).join(" ");
  if (!kind || !source) {
    console.log("usage: Anchor.ts youtube|site <source name>");
    process.exit(1);
  }
  const index = await loadIndex();
  const r = await regenerateAnchor(index, { kind, source });
  console.log(`${r.created ? "created" : "updated"} ${r.path} (${r.count} children)`);
}
