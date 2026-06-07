#!/usr/bin/env bun
/**
 * MigrateVaultFrontmatter.ts
 *
 * Migrates existing Obsidian vault notes to a unified frontmatter schema.
 *
 * Safe by design:
 *   - `--dry-run` writes nothing; it only reports what WOULD change.
 *   - Hard exclusions are checked before any transform runs.
 *   - YAML parse failures SKIP the file (never corrupt).
 *   - Per-file write errors are isolated; one failure never stops the rest.
 *   - All transformations are idempotent: a second run produces 0 changes.
 *
 * The body of each note (everything after the closing `---`) is preserved
 * byte-for-byte. Only the frontmatter block is rewritten, and only fields that
 * actually change are touched. Field ORDER is preserved for untouched fields.
 *
 * Usage:
 *   bun MigrateVaultFrontmatter.ts --dry-run
 *   bun MigrateVaultFrontmatter.ts --folder "02 Cards"
 *   bun MigrateVaultFrontmatter.ts --type voice
 *   bun MigrateVaultFrontmatter.ts --folder "05 Journal" --type note --dry-run
 */

import { readdir, stat, mkdir, rename } from "node:fs/promises";
import { join, relative, sep } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const VAULT_ROOT = "/opt/docker/appdata/obsidian-jellybase/vault/OB_v2";

const LOG_PATH =
  "/home/jellypai/.claude/PAI/MEMORY/WORK/20260607-140000_obsidian-capture-system/migration.log";

/** Folders processed by default when no --folder flag is given. */
const ACTIVE_SCOPE_FOLDERS = [
  "00 INBOX",
  "02 Cards",
  "03 Spaces",
  "05 Journal",
  "07 PAI",
] as const;

/** Path segments that exclude a file regardless of any flag. */
const EXCLUDED_SEGMENTS = ["Archive", ".obsidian", ".trash", "_ephemeral"] as const;

/** Daily-note specific fields that should not live on regular notes. */
const DAILY_ONLY_FIELDS = new Set([
  "Connected",
  "DailyHighlight",
  "DailyInterest",
  "DailyEnergy",
  "DailyProductivity",
  "DailyGratitude",
]);

/** Tags marking a file as a journal/daily note (Daily fields kept there). */
const JOURNAL_TAG_MARKERS = ["My/Daily", "My/Journal"];

// ─────────────────────────────────────────────────────────────────────────────
// CLI parsing
// ─────────────────────────────────────────────────────────────────────────────

interface CliOptions {
  dryRun: boolean;
  folder: string | null;
  type: string | null;
}

function parseCli(argv: string[]): CliOptions {
  const opts: CliOptions = { dryRun: false, folder: null, type: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--folder": {
        const value = argv[++i];
        if (value === undefined || value.startsWith("--")) {
          throw new Error(`--folder requires a value (got: ${value ?? "<end>"})`);
        }
        opts.folder = value;
        break;
      }
      case "--type": {
        const value = argv[++i];
        if (value === undefined || value.startsWith("--")) {
          throw new Error(`--type requires a value (got: ${value ?? "<end>"})`);
        }
        opts.type = value;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Frontmatter model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single frontmatter field. We keep the raw lines for fields we do not touch
 * so we can re-emit them byte-for-byte and preserve ordering.
 */
interface RawField {
  key: string;
  rawLines: string[];
  inlineValue: string; // text after "key:" on the first line, trimmed
  listItems: string[]; // block-list items ("- x") from continuation lines
}

interface ParsedFrontmatter {
  fields: RawField[];
}

interface ParsedFile {
  hasFrontmatter: boolean;
  frontmatter: ParsedFrontmatter;
  body: string; // everything after the closing `---`, delimiter excluded
  eol: "\n" | "\r\n";
  rawFrontmatterText: string; // exact original FM text, for diffing
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

function detectEol(text: string): "\n" | "\r\n" {
  const firstNl = text.indexOf("\n");
  if (firstNl > 0 && text[firstNl - 1] === "\r") return "\r\n";
  return "\n";
}

/**
 * Splits a file into (frontmatter-block-text, body-text). Frontmatter is only
 * recognised when the file STARTS with a `---` line and a later `---` line
 * closes it. The body is everything after the closing delimiter line, rejoined
 * with the detected EOL (the leading newline after the delimiter is re-added at
 * compose time).
 */
function splitFrontmatter(
  content: string,
  eol: "\n" | "\r\n"
): { fmText: string | null; body: string } {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || lines[0] !== "---") {
    return { fmText: null, body: content };
  }
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      closingIdx = i;
      break;
    }
  }
  if (closingIdx === -1) {
    return { fmText: null, body: content };
  }
  const fmLines = lines.slice(1, closingIdx);
  const bodyLines = lines.slice(closingIdx + 1);
  return { fmText: fmLines.join(eol), body: bodyLines.join(eol) };
}

const KEY_LINE_RE = /^([A-Za-z][A-Za-z0-9_-]*):(.*)$/;

/**
 * Tolerant line-based frontmatter parser. Vault frontmatter is simple
 * key/scalar/block-list; a full YAML library would reorder and reformat
 * untouched fields, which we must avoid. Continuation lines (indented or `- `
 * list items) attach to the preceding key. Throws on duplicate top-level keys
 * (case-insensitive) so the caller can SKIP-and-log rather than guess.
 */
function parseFrontmatter(fmText: string): ParsedFrontmatter {
  const fields: RawField[] = [];
  if (fmText.length === 0) return { fields };

  const lines = fmText.split(/\r?\n/);
  let current: RawField | null = null;

  for (const line of lines) {
    const keyMatch = line.match(KEY_LINE_RE);
    const looksLikeContinuation =
      line.startsWith(" ") || line.startsWith("\t") || line.startsWith("-");

    if (keyMatch && !looksLikeContinuation) {
      if (current) fields.push(current);
      current = {
        key: keyMatch[1],
        rawLines: [line],
        inlineValue: keyMatch[2].trim(),
        listItems: [],
      };
      continue;
    }

    if (current && looksLikeContinuation) {
      current.rawLines.push(line);
      const listMatch = line.match(/^\s*-\s+(.*)$/);
      if (listMatch) current.listItems.push(listMatch[1].trim());
      continue;
    }
    // Lines belonging to no field (blank, stray `{}`, junk) are dropped from
    // the model; they carry no schema meaning and re-adding them would break
    // idempotency.
  }
  if (current) fields.push(current);

  const seen = new Set<string>();
  for (const f of fields) {
    const lc = f.key.toLowerCase();
    if (seen.has(lc)) throw new Error(`duplicate frontmatter key: ${f.key}`);
    seen.add(lc);
  }
  return { fields };
}

function parseFile(content: string): ParsedFile {
  const eol = detectEol(content);
  const { fmText, body } = splitFrontmatter(content, eol);
  if (fmText === null) {
    return {
      hasFrontmatter: false,
      frontmatter: { fields: [] },
      body: content,
      eol,
      rawFrontmatterText: "",
    };
  }
  return {
    hasFrontmatter: true,
    frontmatter: parseFrontmatter(fmText),
    body,
    eol,
    rawFrontmatterText: fmText,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Value normalisation helpers
// ─────────────────────────────────────────────────────────────────────────────

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2) {
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      return v.slice(1, -1);
    }
  }
  return v;
}

function stripWikilink(value: string): string {
  const v = unquote(value).trim();
  const m = v.match(/^\[\[\s*(.*?)\s*\]\]$/);
  return m ? m[1].trim() : v;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidYmd(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1900 || y > 2200) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseNamedDate(v: string): string | null {
  const lower = v.toLowerCase();
  let m = lower.match(/^([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/); // July 16, 2025
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3)];
    const d = +m[2];
    const y = +m[3];
    if (mo && isValidYmd(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  m = lower.match(/^(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})$/); // 16 July 2025
  if (m) {
    const d = +m[1];
    const mo = MONTHS[m[2].slice(0, 3)];
    const y = +m[3];
    if (mo && isValidYmd(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  return null;
}

/**
 * Normalises an arbitrary date-ish string to `YYYY-MM-DD`. Returns null when
 * nothing date-like can be extracted (caller then falls back to mtime). Vault
 * locale is en-GB, so ambiguous numeric `dd-mm-yyyy` is read day-first.
 */
function normaliseDate(rawValue: string): string | null {
  const v = stripWikilink(rawValue).trim();
  if (v.length === 0) return null;

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})\b/); // YYYY-MM-DD [time...]
  if (iso) {
    const [, y, mo, d] = iso;
    if (isValidYmd(+y, +mo, +d)) return `${y}-${mo}-${d}`;
  }

  const isoSlash = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\b/); // YYYY/MM/DD
  if (isoSlash) {
    const y = isoSlash[1];
    const mo = pad2(+isoSlash[2]);
    const d = pad2(+isoSlash[3]);
    if (isValidYmd(+y, +mo, +d)) return `${y}-${mo}-${d}`;
  }

  const dmy = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/); // DD-MM-YYYY / DD/MM/YYYY
  if (dmy) {
    const d = +dmy[1];
    const mo = +dmy[2];
    const y = +dmy[3];
    if (isValidYmd(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }

  const named = parseNamedDate(v);
  if (named) return named;

  const parsed = new Date(v); // last resort
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const mo = parsed.getUTCMonth() + 1;
    const d = parsed.getUTCDate();
    if (y > 1900 && y < 2200) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  return null;
}

function normaliseTag(raw: string): string {
  let t = unquote(raw).trim();
  if (t.startsWith("#")) t = t.slice(1);
  return t.trim();
}

/**
 * Collects all tag tokens from a tags field (inline `[a, b]`, inline `#a #b`,
 * or block-list form). Returns normalised, de-duplicated, order-preserved list.
 */
function collectTags(field: RawField): string[] {
  const out: string[] = [];
  const push = (tok: string) => {
    const n = normaliseTag(tok);
    if (n.length > 0 && !out.includes(n)) out.push(n);
  };

  const inline = field.inlineValue;
  if (inline.length > 0) {
    if (inline.startsWith("[") && inline.endsWith("]")) {
      for (const part of inline.slice(1, -1).split(",")) {
        if (part.trim().length > 0) push(part);
      }
    } else if (inline.includes("#")) {
      for (const part of inline.split(/\s+/)) {
        if (part.trim().length > 0) push(part);
      }
    } else {
      push(inline);
    }
  }
  for (const item of field.listItems) push(item);
  return out;
}

function collectListLikeValues(field: RawField): string[] {
  if (field.listItems.length > 0) return field.listItems.map((i) => unquote(i));
  const inline = field.inlineValue;
  if (inline.startsWith("[") && inline.endsWith("]")) {
    return inline
      .slice(1, -1)
      .split(",")
      .map((s) => unquote(s.trim()))
      .filter((s) => s.length > 0);
  }
  return inline.length ? [unquote(inline)] : [];
}

function summariseOldTags(field: RawField): string {
  if (field.listItems.length > 0) {
    return `[${field.listItems.map((t) => unquote(t)).join(", ")}]`;
  }
  return field.inlineValue || "[]";
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field accessors
// ─────────────────────────────────────────────────────────────────────────────

function getField(fm: ParsedFrontmatter, keyLower: string): RawField | null {
  return fm.fields.find((x) => x.key.toLowerCase() === keyLower) ?? null;
}

function readTypeValue(fm: ParsedFrontmatter): string | null {
  const f = getField(fm, "type");
  return f ? unquote(f.inlineValue) : null;
}

function noteIsJournal(fm: ParsedFrontmatter): boolean {
  const tagsField = getField(fm, "tags");
  if (!tagsField) return false;
  for (const t of collectTags(tagsField)) {
    for (const marker of JOURNAL_TAG_MARKERS) {
      if (t === marker || t.startsWith(`${marker}/`)) return true;
    }
  }
  return false;
}

function deriveTitle(fileName: string): string {
  let name = fileName.replace(/\.md$/i, "");
  name = name.replace(/^\d{4}-\d{2}-\d{2}[ _-]+/, "");
  name = name.replace(/^\d{2}-\d{2}-\d{2,4}[ _-]+/, "");
  return name.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformation
// ─────────────────────────────────────────────────────────────────────────────

interface ChangeNote {
  description: string;
}

interface OutField {
  key: string;
  lines: string[];
}

interface TransformResult {
  changed: boolean;
  changes: ChangeNote[];
  newContent: string;
  skipped: boolean;
  skipReason?: string;
}

/**
 * Applies all schema transformations to a parsed file. Pure (no writes).
 * Idempotent: re-running on its own output yields changed === false because
 * every produced field already satisfies the target schema.
 */
function transform(parsed: ParsedFile, fileName: string, mtime: Date): TransformResult {
  const fm = parsed.frontmatter;
  const changes: ChangeNote[] = [];

  // Guard: pai-session is never touched.
  if (readTypeValue(fm) === "pai-session") {
    return {
      changed: false,
      changes: [],
      newContent: "",
      skipped: true,
      skipReason: "type: pai-session",
    };
  }

  // Start output from existing fields (verbatim) to preserve order.
  const out: OutField[] = fm.fields.map((f) => ({ key: f.key, lines: [...f.rawLines] }));
  const idxOf = (keyLower: string): number =>
    out.findIndex((f) => f.key.toLowerCase() === keyLower);

  const scalarLine = (key: string, value: string): string => `${key}: ${value}`;
  const keysToRemove = new Set<string>();

  // 1. Tag normalisation.
  const tagsIdx = idxOf("tags");
  if (tagsIdx !== -1) {
    const tagsField = fm.fields[tagsIdx];
    const normalised = collectTags(tagsField);
    const newLine = `tags: [${normalised.join(", ")}]`;
    if (tagsField.rawLines.length !== 1 || tagsField.rawLines[0] !== newLine) {
      out[tagsIdx].lines = [newLine];
      changes.push({
        description: `tags: ${summariseOldTags(tagsField)} → [${normalised.join(", ")}]`,
      });
    }
  }

  const isJournal = noteIsJournal(fm);

  // 2. Date normalisation (priority: Date-Created > Date-Added > date).
  const dcField = getField(fm, "date-created");
  const daField = getField(fm, "date-added");
  const dateField = getField(fm, "date");

  let resolvedDate: string | null = null;
  let oldDateDisplay = "";
  let dateSourceLabel = "";

  if (dcField) {
    resolvedDate = normaliseDate(dcField.inlineValue);
    oldDateDisplay = dcField.inlineValue.trim();
    dateSourceLabel = "Date-Created";
  } else if (daField) {
    resolvedDate = normaliseDate(daField.inlineValue);
    oldDateDisplay = daField.inlineValue.trim();
    dateSourceLabel = "Date-Added";
  } else if (dateField) {
    resolvedDate = normaliseDate(dateField.inlineValue);
    oldDateDisplay = dateField.inlineValue.trim();
    dateSourceLabel = "date";
  }

  if (resolvedDate === null) {
    resolvedDate = formatYmd(mtime);
    if (!dcField && !daField && !dateField) {
      dateSourceLabel = "mtime";
      oldDateDisplay = "<none>";
    } else {
      oldDateDisplay = oldDateDisplay.length ? oldDateDisplay : "<empty>";
    }
  }

  const newDateLine = scalarLine("date", resolvedDate);

  if (dcField) keysToRemove.add("date-created");
  if (daField) keysToRemove.add("date-added");

  const dIdx = idxOf("date");
  const dcIdx = idxOf("date-created");
  const daIdx = idxOf("date-added");

  if (dIdx !== -1) {
    if (out[dIdx].lines.length !== 1 || out[dIdx].lines[0] !== newDateLine) {
      out[dIdx].lines = [newDateLine];
      changes.push({ description: `date: ${oldDateDisplay} → ${resolvedDate}` });
    }
  } else if (dcIdx !== -1) {
    out[dcIdx] = { key: "date", lines: [newDateLine] };
    keysToRemove.delete("date-created"); // slot reused as `date`
    changes.push({ description: `Date-Created → date: ${oldDateDisplay} → ${resolvedDate}` });
  } else if (daIdx !== -1) {
    out[daIdx] = { key: "date", lines: [newDateLine] };
    keysToRemove.delete("date-added");
    changes.push({ description: `Date-Added → date: ${oldDateDisplay} → ${resolvedDate}` });
  } else {
    out.push({ key: "date", lines: [newDateLine] });
    changes.push({ description: `date: <added from ${dateSourceLabel}> ${resolvedDate}` });
  }

  // 3. Type field.
  const typeIdx = idxOf("type");
  let effectiveType: string | null = readTypeValue(fm);
  let addedSourceVoice = false;

  if (typeIdx === -1) {
    out.push({ key: "type", lines: [scalarLine("type", "note")] });
    effectiveType = "note";
    changes.push({ description: `type: <added> note` });
  } else {
    const field = fm.fields[typeIdx];
    const currentVal = unquote(field.inlineValue);
    const keyNeedsLowercasing = field.key !== "type";

    if (currentVal === "voice") {
      out[typeIdx] = { key: "type", lines: [scalarLine("type", "capture")] };
      effectiveType = "capture";
      addedSourceVoice = true;
      changes.push({ description: `type: voice → capture (+ source: voice)` });
    } else if (keyNeedsLowercasing) {
      const valuePart = field.rawLines[0].slice(field.rawLines[0].indexOf(":") + 1);
      out[typeIdx] = { key: "type", lines: [`type:${valuePart}`, ...field.rawLines.slice(1)] };
      effectiveType = currentVal;
      changes.push({ description: `Type → type: ${currentVal}` });
    } else {
      effectiveType = currentVal; // canonical key + non-voice value → preserve
    }
  }

  // 4. Source: voice (when converted from voice).
  if (addedSourceVoice) {
    const srcIdx = idxOf("source");
    if (srcIdx === -1) out.push({ key: "source", lines: [scalarLine("source", "voice")] });
    else out[srcIdx] = { key: "source", lines: [scalarLine("source", "voice")] };
  }

  // 5. Title field.
  if (idxOf("title") === -1) {
    const derived = deriveTitle(fileName);
    out.push({ key: "title", lines: [scalarLine("title", JSON.stringify(derived))] });
    changes.push({ description: `title: <added> ${JSON.stringify(derived)}` });
  }

  // 6. Default source for capture/note (empty), only when none added above.
  if ((effectiveType === "capture" || effectiveType === "note") && !addedSourceVoice) {
    if (idxOf("source") === -1) {
      out.push({ key: "source", lines: [`source: ""`] });
      changes.push({ description: `source: <added> ""` });
    }
  }

  // 7. Remove legacy daily-only fields (non-journal notes only).
  if (!isJournal) {
    for (const f of fm.fields) {
      if (DAILY_ONLY_FIELDS.has(f.key)) {
        keysToRemove.add(f.key.toLowerCase());
        changes.push({ description: `removed legacy field: ${f.key}` });
        continue;
      }
      if (f.key.toLowerCase() === "category") {
        const items = collectListLikeValues(f);
        const removable =
          items.length === 1 && (items[0] === "Ideas" || items[0] === "People");
        if (removable) {
          keysToRemove.add("category");
          changes.push({ description: `removed legacy field: Category (${items.join(", ")})` });
        }
      }
    }
  }

  const finalFields = out.filter((f) => !keysToRemove.has(f.key.toLowerCase()));

  // Compose new frontmatter text.
  const nl = parsed.eol;
  const fmBodyLines: string[] = [];
  for (const f of finalFields) for (const line of f.lines) fmBodyLines.push(line);
  const newFmText = fmBodyLines.join(nl);

  const fmActuallyChanged =
    !parsed.hasFrontmatter || newFmText !== parsed.rawFrontmatterText;

  if (!fmActuallyChanged && changes.length === 0) {
    return { changed: false, changes: [], newContent: "", skipped: false };
  }

  // Re-compose: `---<nl><fm><nl>---<nl><body>`. The body had its delimiter and
  // the single newline after it stripped at parse time, so we re-add exactly
  // one separating newline here. For a no-frontmatter file, body is the whole
  // original content and we prepend a fresh block.
  const body = parsed.body;
  const newContent = `---${nl}${newFmText}${nl}---${nl}${body}`;

  // Idempotency guard: identical reconstruction of the original → no change.
  if (parsed.hasFrontmatter) {
    const original = `---${nl}${parsed.rawFrontmatterText}${nl}---${nl}${body}`;
    if (newContent === original) {
      return { changed: false, changes: [], newContent: "", skipped: false };
    }
  }

  return {
    changed: true,
    changes: changes.length ? changes : [{ description: "frontmatter normalised" }],
    newContent,
    skipped: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Filesystem walk + scope filtering
// ─────────────────────────────────────────────────────────────────────────────

function isExcludedPath(absPath: string): boolean {
  for (const seg of absPath.split(sep)) {
    if ((EXCLUDED_SEGMENTS as readonly string[]).includes(seg)) return true;
  }
  return false;
}

async function walkMarkdown(root: string): Promise<string[]> {
  const results: string[] = [];
  async function recurse(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable dir → skip silently
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (isExcludedPath(full)) continue;
      if (entry.isDirectory()) {
        await recurse(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(full);
      }
    }
  }
  await recurse(root);
  return results.sort();
}

function resolveScanRoots(folder: string | null): string[] {
  if (folder) return [join(VAULT_ROOT, folder)];
  return ACTIVE_SCOPE_FOLDERS.map((f) => join(VAULT_ROOT, f));
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────

class Logger {
  private buffer: string[] = [];

  line(text: string): void {
    this.buffer.push(text);
    console.log(text);
  }

  raw(text: string): void {
    this.buffer.push(text);
  }

  async flush(path: string): Promise<void> {
    try {
      const dir = path.slice(0, path.lastIndexOf("/"));
      await mkdir(dir, { recursive: true });
      await Bun.write(path, this.buffer.join("\n") + "\n");
    } catch (err) {
      console.error(`[log-write-error] could not write log to ${path}: ${describeError(err)}`);
    }
  }
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

interface Tally {
  modified: number;
  skipped: number;
  unchanged: number;
  errors: number;
}

async function processFile(
  absPath: string,
  opts: CliOptions,
  log: Logger,
  tally: Tally
): Promise<void> {
  const rel = relative(VAULT_ROOT, absPath);
  const fileName = absPath.slice(absPath.lastIndexOf("/") + 1);

  let content: string;
  try {
    content = await Bun.file(absPath).text();
  } catch (err) {
    tally.errors++;
    log.line(`[ERROR] ${rel} — read failed: ${describeError(err)}`);
    return;
  }

  let parsed: ParsedFile;
  try {
    parsed = parseFile(content);
  } catch (err) {
    tally.skipped++;
    log.line(`[SKIPPED] ${rel} — YAML parse error: ${describeError(err)}`);
    return;
  }

  if (opts.type) {
    const currentType = readTypeValue(parsed.frontmatter);
    if ((currentType ?? "") !== opts.type) return; // out of selected scope
  }

  let mtime = new Date();
  try {
    mtime = (await stat(absPath)).mtime;
  } catch {
    /* keep "now" as a safe fallback */
  }

  let result: TransformResult;
  try {
    result = transform(parsed, fileName, mtime);
  } catch (err) {
    tally.errors++;
    log.line(`[ERROR] ${rel} — transform failed: ${describeError(err)}`);
    return;
  }

  if (result.skipped) {
    tally.skipped++;
    log.line(`[SKIPPED] ${result.skipReason}: ${rel}`);
    return;
  }

  if (!result.changed || result.newContent === content) {
    tally.unchanged++;
    log.line(`[UNCHANGED] ${rel} (no changes needed)`);
    return;
  }

  log.line(`[${opts.dryRun ? "DRY-RUN" : "MODIFIED"}] ${rel}`);
  for (const c of result.changes) log.line(`  ${c.description}`);

  if (opts.dryRun) {
    tally.modified++;
    return;
  }

  try {
    const tmp = `${absPath}.tmp-migrate-${process.pid}`;
    await Bun.write(tmp, result.newContent);
    await rename(tmp, absPath); // atomic replace; no partial files on crash
    tally.modified++;
  } catch (err) {
    tally.errors++;
    log.line(`[ERROR] ${rel} — write failed: ${describeError(err)}`);
  }
}

async function main(): Promise<void> {
  let opts: CliOptions;
  try {
    opts = parseCli(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${describeError(err)}`);
    console.error(
      `Usage: bun MigrateVaultFrontmatter.ts [--dry-run] [--folder "<subfolder>"] [--type <type>]`
    );
    process.exit(2);
    return;
  }

  const log = new Logger();
  log.raw(`# Vault Frontmatter Migration`);
  log.raw(`# started: ${new Date().toISOString()}`);
  log.raw(`# vault: ${VAULT_ROOT}`);
  log.raw(
    `# options: dry-run=${opts.dryRun} folder=${opts.folder ?? "<all-scope>"} type=${opts.type ?? "<any>"}`
  );
  log.raw("");

  const tally: Tally = { modified: 0, skipped: 0, unchanged: 0, errors: 0 };

  const allFiles: string[] = [];
  for (const root of resolveScanRoots(opts.folder)) {
    if (isExcludedPath(root)) {
      log.line(`[SKIPPED] excluded root: ${relative(VAULT_ROOT, root)}`);
      continue;
    }
    allFiles.push(...(await walkMarkdown(root)));
  }
  const uniqueFiles = Array.from(new Set(allFiles)).sort();

  log.line(`Scanning ${uniqueFiles.length} markdown file(s)...`);
  log.line("");

  for (const file of uniqueFiles) {
    if (isExcludedPath(file)) {
      tally.skipped++;
      log.line(`[SKIPPED] excluded path: ${relative(VAULT_ROOT, file)}`);
      continue;
    }
    await processFile(file, opts, log, tally);
  }

  log.line("");
  log.line(
    `Modified: ${tally.modified}, Skipped: ${tally.skipped}, Unchanged: ${tally.unchanged}, Errors: ${tally.errors}`
  );
  if (opts.dryRun) log.line(`(dry-run: no files were written)`);

  await log.flush(LOG_PATH);
}

main().catch((err) => {
  console.error(`Fatal: ${describeError(err)}`);
  process.exit(1);
});
