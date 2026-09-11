#!/usr/bin/env bun
/**
 * Note writing and the work/personal boundary.
 *
 * The boundary gate FAILS CLOSED: an unrecognised work domain must never reach
 * the vault. Work source material belongs in ~/corpus/inform/, per the vault
 * boundary rule in OPERATIONAL_RULES.md.
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import type { CaptureKind, IndexEntry, Medium, ItemStatus } from "./types.ts";
import { KIND_FOLDER } from "./types.ts";
import { VAULT } from "./TagVocabulary.ts";
import { safeName, ANCHOR_FOLDER } from "./Anchor.ts";

/**
 * Work domains. Personal-only is a hard constraint (Q6), so anything here is
 * refused rather than filed.
 */
const WORK_DOMAINS = [
  "theinformteam.com",
  "sharepoint.com",
  "office.com",
  "office365.com",
  "microsoftonline.com",
  "dev.azure.com",
  "visualstudio.com",
];

export interface BoundaryVerdict {
  allowed: boolean;
  reason?: string;
  redirect?: string;
}

export function checkBoundary(url: string | undefined): BoundaryVerdict {
  if (!url) return { allowed: true };
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return { allowed: true };
  }
  const hit = WORK_DOMAINS.find((d) => host === d || host.endsWith(`.${d}`));
  if (hit) {
    return {
      allowed: false,
      reason: `${host} is work material; the vault holds personal material only`,
      redirect: "~/corpus/inform/",
    };
  }
  return { allowed: true };
}

export interface NoteInput {
  title: string;
  kind: CaptureKind;
  medium: Medium;
  url?: string;
  author?: string;
  published?: string;
  duration?: string;
  /** Channel name or site domain. */
  source?: string;
  tags: string[];
  summary: string;
  status?: ItemStatus;
  /** Verbatim text, for snippet captures with no URL. */
  body?: string;
  /** Wikilink names of related existing notes. */
  related?: string[];
  /** Stated when enrichment degraded, e.g. transcript unavailable. */
  provenance?: string;
  /**
   * Rich capture sections (video, and any source with a transcript).
   *
   * Modelled on the format already proven in Sources/YouTube — the Marina Wyss
   * capture skeleton. A one-paragraph summary loses the quotable lines and the
   * how-to spine, which are the two things worth coming back for. Every field is
   * optional: a thin capture still renders, it just renders shorter.
   */
  takeaways?: string[];
  quotes?: string[];
  bestIdeas?: string[];
  tools?: string[];
  /** The how-to spine: a setup, workflow, or numbered process. */
  method?: string[];
  /** Mermaid body (no fences) mapping the argument. */
  mindmap?: string;
  /** The single thing the speaker most wants understood. */
  keyMessage?: string;
  /** Set by the orchestrator when the source's anchor is already on disk. */
  anchorExists?: boolean;
}

function yamlList(items: string[]): string {
  return `[${items.map((t) => (/[:,#[\]{}]/.test(t) ? `"${t}"` : t)).join(", ")}]`;
}

export function renderNote(input: NoteInput, today = new Date().toISOString().slice(0, 10)): string {
  const fm: string[] = [
    `title: ${input.title.includes(":") ? `"${input.title}"` : input.title}`,
    `type: reference`,
    `kind: ${input.kind}`,
    `medium: ${input.medium}`,
  ];
  if (input.url) fm.push(`url: ${input.url}`);
  if (input.author) fm.push(`author: ${input.author}`);
  if (input.published) fm.push(`published: ${input.published}`);
  if (input.duration) fm.push(`duration: "${input.duration}"`);
  if (input.source) {
    // Which key names the parent source. "channel" covers YouTube on both sides:
    // a video belongs to a channel, and a channel anchor names itself. Anything
    // else is a site. (Found 2026-09-07: capturing a channel directly wrote
    // `site:` because the ternary only considered kind === "video".)
    const youtube = input.kind === "video" || input.kind === "channel";
    fm.push(`${youtube ? "channel" : "site"}: ${input.source}`);
  }
  fm.push(`captured: ${today}`);
  fm.push(`status: ${input.status ?? "captured"}`);
  fm.push(`tags: ${yamlList(input.tags)}`);
  fm.push(`thinking-notes: []`);

  // Point at the anchor only when one actually exists — an unearned source
  // would otherwise leave a dead wikilink in every note (found in live use,
  // 2026-09-07: the first Vicky Zhao capture linked an anchor with 1 child).
  // Path-qualified, not a bare basename: Obsidian resolves `[[Vicky Zhao]]` by
  // basename, so once a channel and a site legitimately share a name (which the
  // medium-scoped anchor namespaces now allow) every child note links to an
  // ambiguous target. The folder is derived from the same predicate that picks
  // the frontmatter key, so the link cannot drift from the anchor's real path.
  const anchorFolder =
    ANCHOR_FOLDER[input.kind === "video" || input.kind === "channel" ? "youtube" : "site"];
  const up = input.anchorExists
    ? `⬆️:: [[Reference/${anchorFolder}/${safeName(input.source!)}|${input.source!}]]`
    : `⬆️:: [[Reference/README|Reference]]`;

  const parts = [`---\n${fm.join("\n")}\n---`, "", up, "", `# ${input.title}`, ""];

  const rich =
    !!(input.takeaways?.length || input.quotes?.length || input.bestIdeas?.length ||
       input.tools?.length || input.method?.length || input.mindmap || input.keyMessage);

  if (input.url && rich) parts.push(`![${input.title}](${input.url})`, "");

  // A rich capture earns section headings; a thin one stays a paragraph.
  if (input.summary) {
    if (rich) parts.push("## Summary", "");
    parts.push(input.summary, "");
  }

  const bullets = (heading: string, items?: string[]) => {
    if (items?.length) parts.push(`## ${heading}`, "", ...items.map((i) => `- ${i}`), "");
  };

  bullets("Key Takeaways", input.takeaways);

  if (input.mindmap) {
    parts.push("## Mindmap", "", "```mermaid", input.mindmap, "```", "");
  }

  if (input.quotes?.length) {
    parts.push("## Notable Quotes", "");
    for (const q of input.quotes) parts.push(`> ${q}`, "");
  }

  bullets("Best Ideas", input.bestIdeas);
  bullets("Tools", input.tools);
  bullets("Method", input.method);

  if (input.keyMessage) parts.push("## Key Message", "", `> ${input.keyMessage}`, "");

  if (input.provenance) parts.push(`> ${input.provenance}`, "");
  if (input.url) parts.push(`**Source:** ${input.url}`, "");
  if (input.body) parts.push("---", "", input.body, "");

  if (input.related?.length) {
    parts.push("## Related", "", ...input.related.map((r) => `- [[${r}]]`), "");
  }

  // Thinking notes are Dom's own words and are written by hand. The heading is
  // seeded so the link back from 01 Thinking has somewhere to land; the skill
  // never fills it in. Reference graduates to Sources only when Dom writes it up.
  if (rich) {
    parts.push(
      "## ⬇️ Thinking notes from this source",
      "",
      "_Atomic notes in my own words that came out of this._",
      "",
    );
  }

  // The reference layer is not a queue: no processing checkbox, by design.
  return parts.join("\n");
}

export interface WriteResult {
  path: string;
  absolute: string;
  entry: IndexEntry;
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function writeNote(input: NoteInput, vault = VAULT): Promise<WriteResult> {
  const verdict = checkBoundary(input.url);
  if (!verdict.allowed) {
    throw new Error(`REFUSED: ${verdict.reason}. Use ${verdict.redirect} instead.`);
  }

  const folder = KIND_FOLDER[input.kind];
  const base = safeName(input.title) || "Untitled";
  let rel = join("Reference", folder, `${base}.md`);
  let abs = join(vault, rel);

  // Never overwrite an existing note; suffix instead.
  let n = 2;
  while (await exists(abs)) {
    rel = join("Reference", folder, `${base} (${n}).md`);
    abs = join(vault, rel);
    n++;
  }

  const today = new Date().toISOString().slice(0, 10);
  await mkdir(join(abs, ".."), { recursive: true });
  await writeFile(abs, renderNote(input, today), "utf8");

  return {
    path: rel,
    absolute: abs,
    entry: {
      path: rel,
      title: input.title,
      kind: input.kind,
      medium: input.medium,
      url: input.url,
      author: input.author,
      source: input.source,
      tags: input.tags,
      summary: input.summary,
      captured: today,
      status: input.status ?? "captured",
    },
  };
}

if (import.meta.main) {
  const url = process.argv[2];
  const v = checkBoundary(url);
  console.log(JSON.stringify(v, null, 2));
}
