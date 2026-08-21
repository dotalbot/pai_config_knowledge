#!/usr/bin/env bun
/**
 * Phase 2c — migrate PAI/USER (nested) → LIFEOS/USER (7.40.4 schema).
 * Additive & non-destructive: reads from PAI/USER, writes to LIFEOS/USER.
 * Never touches the source. Dry-run by default; pass --apply to write.
 * Skips macOS AppleDouble (._*) cruft. Parks anything unmapped verbatim
 * under LIFEOS/USER/_migrated-from-pai/ so NOTHING is lost.
 */
import { existsSync, mkdirSync, cpSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const HOME = process.env.HOME!;
const SRC = join(HOME, ".claude/PAI/USER");
const DST = join(HOME, ".claude/LIFEOS/USER");
const APPLY = process.argv.includes("--apply");

// Explicit mappings: old PAI/USER relative path → new LIFEOS/USER relative path.
// Anything NOT listed here is parked verbatim under _migrated-from-pai/.
const MAP: Record<string, string> = {
  "PRINCIPAL_IDENTITY.md":   "PRINCIPAL/PRINCIPAL_IDENTITY.md",
  "RESUME.md":               "PRINCIPAL/RESUME.md",
  "WRITINGSTYLE.md":         "PRINCIPAL/WRITINGSTYLE.md",
  "RHETORICALSTYLE.md":      "PRINCIPAL/RHETORICALSTYLE.md",
  "AI_WRITING_PATTERNS.md":  "PRINCIPAL/AI_WRITING_PATTERNS.md",
  "PRONUNCIATIONS.md":       "PRINCIPAL/PRONUNCIATIONS.md",
  "DA_IDENTITY.md":          "DIGITAL_ASSISTANT/DA_IDENTITY.md",
  "OUR_STORY.md":            "DIGITAL_ASSISTANT/OUR_STORY.md",
  "CONTACTS.md":             "CONTACTS.md",
  "DEFINITIONS.md":          "DEFINITIONS.md",
  "OPINIONS.md":             "OPINIONS.md",
  "CORECONTENT.md":          "CANONICAL_CONTENT.md",
  "FEED.md":                 "FEED.md",
  // dirs mapped whole
  "TELOS":                   "TELOS",
  "BUSINESS":                "BUSINESS",
  "HEALTH":                  "HEALTH",
  "FINANCES":                "FINANCES",
  "SKILLCUSTOMIZATIONS":     "SKILLCUSTOMIZATIONS",
};

const isJunk = (n: string) => n.startsWith("._") || n === ".DS_Store";

function ensureDir(p: string) {
  if (APPLY) mkdirSync(p, { recursive: true });
}

// copy a file or dir tree, skipping AppleDouble junk
function copyClean(src: string, dst: string) {
  const st = statSync(src);
  if (st.isDirectory()) {
    ensureDir(dst);
    for (const entry of readdirSync(src)) {
      if (isJunk(entry)) continue;
      copyClean(join(src, entry), join(dst, entry));
    }
  } else {
    ensureDir(dirname(dst));
    if (APPLY) copyFileSync(src, dst);
  }
}

const planned: string[] = [];
const parked: string[] = [];

if (!existsSync(SRC)) { console.error("no source:", SRC); process.exit(1); }

for (const entry of readdirSync(SRC)) {
  if (isJunk(entry)) continue;
  const srcPath = join(SRC, entry);
  if (MAP[entry]) {
    const dstPath = join(DST, MAP[entry]);
    planned.push(`MAP  ${entry}  →  USER/${MAP[entry]}`);
    copyClean(srcPath, dstPath);
  } else {
    const dstPath = join(DST, "_migrated-from-pai", entry);
    parked.push(`PARK ${entry}  →  USER/_migrated-from-pai/${entry}`);
    copyClean(srcPath, dstPath);
  }
}

console.log(JSON.stringify({
  apply: APPLY,
  src: SRC,
  dst: DST,
  mappedCount: planned.length,
  parkedCount: parked.length,
  mapped: planned,
  parked,
}, null, 2));
