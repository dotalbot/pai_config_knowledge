#!/usr/bin/env bun
/**
 * Contextual surfacing (US-8) — the entire point of the skill.
 *
 * Nine stories describe filing; this one describes the payoff. Search must run
 * with Obsidian closed and the Mac offline, in well under two seconds, and must
 * stay SILENT on zero matches (AC-8.7): a skill that says "nothing found" every
 * time a subject is mentioned gets muted within a week.
 */

import type { IndexEntry, ReferenceIndex } from "./types.ts";
import { loadIndex, saveIndex, isAsleep, parseDuration, INDEX_PATH } from "./Index.ts";
import { normalise } from "./TagVocabulary.ts";

export const MAX_SURFACED = 3;

/** Words too common to carry subject signal. */
const STOP = new Set([
  "the","a","an","and","or","but","if","of","to","in","on","for","with","at","by",
  "from","as","is","are","was","were","be","been","being","it","its","this","that",
  "these","those","i","you","we","they","how","what","why","when","where","which",
  "do","does","did","can","could","should","would","will","about","into","over",
  "some","any","more","most","one","also","just","than","then","there","their",
]);

/**
 * Short tokens that carry real subject signal and must survive the length filter.
 * `ai` is the vault's most-used subject tag; dropping it silently broke every
 * AI-related surface (found by test, 2026-09-07).
 */
const SHORT_KEEP = new Set(["ai", "ml", "ux", "ui", "3d", "os", "db", "js", "ts", "go", "cd", "qa"]);

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0 && !STOP.has(w))
    .filter((w) => w.length > 2 || SHORT_KEEP.has(w));
}

/** Light stemming so "systems" matches "system" without a stemmer dependency. */
function stem(w: string): string {
  if (w.length <= 3) return w;
  return w.replace(/(ing|ies|ed|es|s)$/, "");
}

export interface Scored {
  entry: IndexEntry;
  score: number;
  why: string;
}

/**
 * Score an entry against subject tokens. Tags weigh heaviest because they are the
 * curated signal; title next; summary last.
 */
export function score(entry: IndexEntry, tokens: string[]): Scored | undefined {
  if (tokens.length === 0) return undefined;
  const stems = new Set(tokens.map(stem));

  let s = 0;
  const hitTags: string[] = [];

  for (const tag of entry.tags) {
    const n = normalise(tag);
    for (const t of stems) {
      if (n === normalise(t) || n.includes(t) || t.includes(n)) {
        s += 5;
        hitTags.push(tag);
        break;
      }
    }
  }

  const titleWords = new Set(tokenise(entry.title).map(stem));
  for (const t of stems) if (titleWords.has(t)) s += 3;

  const summaryWords = new Set(tokenise(entry.summary).map(stem));
  for (const t of stems) if (summaryWords.has(t)) s += 1;

  if (s === 0) return undefined;

  const why = hitTags.length
    ? `tagged ${[...new Set(hitTags)].slice(0, 3).join(", ")}`
    : "title and summary match";
  return { entry, score: s, why };
}

export function search(index: ReferenceIndex, subject: string, limit = MAX_SURFACED): Scored[] {
  const tokens = tokenise(subject);
  return index.entries
    .map((e) => score(e, tokens))
    .filter((x): x is Scored => x !== undefined)
    .sort((a, b) => b.score - a.score || (b.entry.captured ?? "").localeCompare(a.entry.captured ?? ""))
    .slice(0, limit);
}

/** Human-readable "captured 3 weeks ago" for the surfacing line. */
export function ago(iso: string, now = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((now.getTime() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 730) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function formatSurfaced(hits: Scored[]): string {
  return hits
    .map((h) => `- **${h.entry.title}** — captured ${ago(h.entry.captured)}, ${h.why}\n  \`${h.entry.path}\`${h.entry.url ? `\n  ${h.entry.url}` : ""}`)
    .join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "sleep") {
    const ms = parseDuration(args[1] ?? "");
    if (ms === undefined) {
      console.error("usage: Surface.ts sleep <30m|2h|1d|1w>");
      process.exit(1);
    }
    const index = await loadIndex();
    index.sleep = { until: new Date(Date.now() + ms).toISOString() };
    await saveIndex(index);
    console.log(`surfacing asleep until ${index.sleep.until}`);
    process.exit(0);
  }

  if (cmd === "wake") {
    const index = await loadIndex();
    delete index.sleep;
    await saveIndex(index);
    console.log("surfacing awake");
    process.exit(0);
  }

  const subject = args.join(" ");
  const index = await loadIndex();

  // Sleep suppresses surfacing only; captures keep working (AC-8.11).
  if (isAsleep(index)) process.exit(0);

  const hits = search(index, subject);
  // Silence on zero matches (AC-8.7).
  if (hits.length === 0) process.exit(0);
  console.log(formatSurfaced(hits));
}
