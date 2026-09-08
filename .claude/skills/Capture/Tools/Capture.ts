#!/usr/bin/env bun
/**
 * Capture orchestrator — takes an enriched payload and commits it everywhere it
 * needs to go, in one atomic-ish operation:
 *
 *   1. the note in ~/obsidian/Reference/
 *   2. the index entry in reference-index.json
 *   3. the anchor, if this source has earned one (regenerated, never appended)
 *
 * Enrichment itself (fetch, summarise, tag) is the model's job and happens in the
 * skill workflow before this tool is called. This tool is deterministic: same
 * payload in, same files out.
 */

import type { CaptureKind, Medium, ReferenceIndex } from "./types.ts";
import { ANCHOR_THRESHOLD, KIND_FOLDER } from "./types.ts";
import { loadIndex, saveIndex, upsert, INDEX_PATH } from "./Index.ts";
import { writeNote, checkBoundary, type NoteInput } from "./Note.ts";
import { regenerateAnchor, hasEarnedAnchor, anchorExists, childrenOf } from "./Anchor.ts";
import { buildVocabulary, reconcile } from "./TagVocabulary.ts";
import { VAULT } from "./TagVocabulary.ts";

export interface CaptureResult {
  note: string;
  tagsIn: string[];
  tagsOut: string[];
  anchor?: { path: string; count: number; created: boolean };
  retroLinked: number;
  refused?: string;
}

/**
 * Payload validation for the `json` entrypoint.
 *
 * `capture()` is fed a JSON payload assembled by the model, and two of its
 * fields are load-bearing in ways a missing value does not announce:
 *
 *   - `medium` lands verbatim in frontmatter, so an absent one wrote the literal
 *     string "undefined" into the note.
 *   - `source` is what `childrenOf` counts, so an absent one silently excluded
 *     the note from its own channel's anchor threshold — three Vicky Zhao videos
 *     counted as one, and no anchor was ever earned.
 *
 * Both were found in live use on 2026-09-07. Neither surfaced an error at the
 * time: the capture reported success and the damage was only visible later, in
 * the frontmatter and in an anchor that never appeared. So this gate fails
 * loudly rather than defaulting, and infers only what is unambiguous.
 */

const MEDIUM_FOR_KIND: Record<CaptureKind, Medium> = {
  video: "youtube",
  channel: "youtube",
  article: "web",
  site: "web",
  tool: "tool",
  snippet: "snippet",
};

const VALID_MEDIA = new Set<string>(["youtube", "web", "snippet", "tool"]);

export interface NormalisedPayload {
  input: NoteInput & { explicitAnchor?: boolean };
  warnings: string[];
}

/**
 * Validate and normalise a raw payload. Throws on anything unrecoverable;
 * returns warnings for values it filled in on the caller's behalf.
 */
export function normalisePayload(raw: unknown): NormalisedPayload {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("payload must be a JSON object");
  }
  const p = raw as Record<string, unknown>;
  const warnings: string[] = [];

  const title = typeof p.title === "string" ? p.title.trim() : "";
  if (!title) throw new Error("payload.title is required and must be a non-empty string");

  const kind = p.kind as CaptureKind;
  if (typeof kind !== "string" || !(kind in KIND_FOLDER)) {
    throw new Error(
      `payload.kind must be one of ${Object.keys(KIND_FOLDER).join(", ")} (got ${JSON.stringify(p.kind)})`,
    );
  }

  // medium is inferable from kind, which Classify.ts already determined — so
  // infer rather than reject, but say so.
  let medium = p.medium as Medium | undefined;
  if (medium === undefined) {
    medium = MEDIUM_FOR_KIND[kind];
    warnings.push(`medium not supplied; inferred "${medium}" from kind "${kind}"`);
  } else if (!VALID_MEDIA.has(medium)) {
    throw new Error(
      `payload.medium must be one of ${[...VALID_MEDIA].join(", ")} (got ${JSON.stringify(p.medium)})`,
    );
  }

  if (!Array.isArray(p.tags) || p.tags.some((t) => typeof t !== "string")) {
    throw new Error("payload.tags is required and must be an array of strings");
  }
  if (typeof p.summary !== "string") {
    throw new Error("payload.summary is required and must be a string");
  }

  // `source` is what binds an item to its channel or site. For a video the
  // author IS the channel, so infer it rather than lose the anchor link.
  let source = typeof p.source === "string" && p.source.trim() ? p.source.trim() : undefined;
  const author = typeof p.author === "string" && p.author.trim() ? p.author.trim() : undefined;
  if (!source && author && (kind === "video" || kind === "channel")) {
    source = author;
    warnings.push(`source not supplied; inferred "${source}" from author (anchor counting needs it)`);
  }
  if (!source && (kind === "video" || kind === "article")) {
    warnings.push(
      `no source for this ${kind}; it will not count toward any channel or site anchor`,
    );
  }

  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  // Rich-capture sections. Non-string members are dropped rather than rendered
  // as "[object Object]" in the vault.
  const strArr = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
    return out.length ? out.map((x) => x.trim()) : undefined;
  };

  return {
    input: {
      title,
      kind,
      medium,
      url: str(p.url),
      author,
      published: str(p.published),
      duration: str(p.duration),
      source,
      tags: p.tags as string[],
      summary: p.summary,
      status: p.status as NoteInput["status"],
      body: str(p.body),
      related: Array.isArray(p.related) ? (p.related as string[]) : undefined,
      provenance: str(p.provenance),
      takeaways: strArr(p.takeaways),
      quotes: strArr(p.quotes),
      bestIdeas: strArr(p.bestIdeas),
      tools: strArr(p.tools),
      method: strArr(p.method),
      mindmap: str(p.mindmap),
      keyMessage: str(p.keyMessage),
      explicitAnchor: p.explicitAnchor === true,
    },
    warnings,
  };
}

export async function capture(
  input: NoteInput & { explicitAnchor?: boolean },
  vault = VAULT,
  indexPath = INDEX_PATH,
): Promise<CaptureResult> {
  const verdict = checkBoundary(input.url);
  if (!verdict.allowed) {
    return {
      note: "",
      tagsIn: input.tags,
      tagsOut: [],
      retroLinked: 0,
      refused: `${verdict.reason}. Use ${verdict.redirect} instead.`,
    };
  }

  // Reconcile tags against the vault's existing vocabulary so a September
  // capture and a November one on the same subject surface together.
  const vocab = await buildVocabulary(vault);
  const tagsOut = [...new Set(input.tags.map((t) => reconcile(t, vocab)))];

  let index = await loadIndex(indexPath);

  // Decide anchor existence BEFORE writing, so the breadcrumb never points at
  // an anchor that will not exist.
  // The item being captured counts toward the threshold, but is not in the
  // index yet — so compare against ANCHOR_THRESHOLD - 1. Without this the note
  // is written pointing at Reference while the anchor is created moments later.
  const priorCount = input.source ? childrenOf(index, input.source).length : 0;
  const willHaveAnchor =
    !!input.source &&
    (input.kind === "video" || input.kind === "article") &&
    (anchorExists(index, input.source) ||
      input.explicitAnchor === true ||
      priorCount + 1 >= ANCHOR_THRESHOLD);

  const written = await writeNote(
    { ...input, tags: tagsOut, anchorExists: willHaveAnchor },
    vault,
  );
  index = upsert(index, written.entry);

  let anchor: CaptureResult["anchor"];
  let retroLinked = 0;

  // A channel or site captured DIRECTLY is itself the anchor, so it always
  // regenerates — otherwise the note lands without the generated fence and never
  // self-populates as children arrive (found 2026-09-07 capturing a channel URL).
  const isAnchorKind = input.kind === "channel" || input.kind === "site";

  if (input.source && (input.kind === "video" || input.kind === "article" || isAnchorKind)) {
    const explicit = input.explicitAnchor === true || isAnchorKind;
    const already = anchorExists(index, input.source);
    if (already || hasEarnedAnchor(index, input.source, explicit)) {
      const kind = input.kind === "video" || input.kind === "channel" ? "youtube" : "site";
      anchor = await regenerateAnchor(index, { kind, source: input.source }, vault);
      // Children already on disk are retro-linked by the regeneration itself.
      retroLinked = anchor.created ? childrenOf(index, input.source).length - 1 : 0;
    }
  }

  await saveIndex(index, indexPath);

  return {
    note: written.path,
    tagsIn: input.tags,
    tagsOut,
    anchor,
    retroLinked: Math.max(0, retroLinked),
  };
}

// ------------------------------------------------------------------- digest

export interface Cluster {
  tag: string;
  count: number;
  titles: string[];
}

/** US-9: grouped review. Never framed as a backlog — no guilt language. */
export function clusters(index: ReferenceIndex, min = 3): Cluster[] {
  const byTag = new Map<string, string[]>();
  for (const e of index.entries) {
    for (const t of e.tags) {
      if (t === "reference" || t === "anchor") continue;
      byTag.set(t, [...(byTag.get(t) ?? []), e.title]);
    }
  }
  return [...byTag.entries()]
    .filter(([, titles]) => titles.length >= min)
    .map(([tag, titles]) => ({ tag, count: titles.length, titles }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function digest(index: ReferenceIndex): string {
  if (index.entries.length === 0) return "Nothing captured yet.";
  const byKind = new Map<CaptureKind, number>();
  for (const e of index.entries) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);

  const lines = [`**${index.entries.length} captured**`, ""];
  lines.push([...byKind].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join(" · "));

  const cl = clusters(index);
  if (cl.length) {
    lines.push("", "**Clusters worth a Thinking note:**", "");
    for (const c of cl.slice(0, 5)) {
      lines.push(`- **${c.tag}** (${c.count}) — ${c.titles.slice(0, 3).join("; ")}`);
    }
  }

  const recent = index.entries.slice(0, 5);
  if (recent.length) {
    lines.push("", "**Most recent:**", "");
    for (const e of recent) lines.push(`- ${e.title} (${e.captured})`);
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const cmd = process.argv[2];
  if (cmd === "digest") {
    console.log(digest(await loadIndex(INDEX_PATH)));
  } else if (cmd === "json") {
    // Payload arrives on stdin as JSON from the skill workflow.
    const raw = await Bun.stdin.text();
    let normalised;
    try {
      normalised = normalisePayload(JSON.parse(raw));
    } catch (err) {
      console.error(`REFUSED: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
    const result = await capture(normalised.input);
    console.log(JSON.stringify({ ...result, warnings: normalised.warnings }, null, 2));
  } else {
    console.log("usage: Capture.ts digest | json (payload on stdin)");
  }
}
