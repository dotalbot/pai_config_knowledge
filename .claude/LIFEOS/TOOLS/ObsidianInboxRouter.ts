#!/usr/bin/env bun
/**
 * ============================================================================
 * ObsidianInboxRouter — files things you dropped in the inbox
 * ============================================================================
 *
 * WHAT IT DOES, in one sentence: every hour it looks at `00 INBOX`, works out
 * what each note IS, and moves it to the folder where that kind of note lives.
 *
 * WHY IT EXISTS: capture has to be frictionless or it does not happen. You dump
 * a voice memo, a clipping, a half-thought into the inbox and move on. Filing is
 * the boring half, so a script does it. Capture stays cheap; the vault stays
 * navigable.
 *
 * ---------------------------------------------------------------------------
 * THE RULES, in the order they are applied
 * ---------------------------------------------------------------------------
 *
 * A note is only touched once it is at least MAX_AGE_MS old (2h). That grace
 * period means something you are still editing never moves out from under you.
 *
 * Then `classify()` asks, in strict priority order:
 *
 *   1. SOURCE OVERRIDE   `source: youtube` in frontmatter → always a source
 *                        document, whatever else it claims to be.
 *   2. TYPE FIELD        `type: <x>` where <x> is a known route.
 *                        This is the reliable path — templates set it.
 *   3. TAGS              `tags: [...]` containing a known route name.
 *   4. FILENAME SIGNALS  "voice", "meeting", "standup", "quote", "idea"…
 *   5. CONTENT SIGNALS   first 20 lines: "attendees:" or "action items" reads
 *                        as a meeting; a leading `>` block reads as a quote.
 *   0. PINNED            `status: pinned` / `router: skip` in frontmatter, or a
 *                        filename starting with `TODO` or `_`, means LEAVE IT.
 *                        Some inbox files are parked deliberately and linked to
 *                        by path from PROJECTS.md and elsewhere.
 *   6. DEFAULT           nothing matched → `00 INBOX/_unrouted/` and a voice
 *                        notification. Deliberately NOT a silent guess: an
 *                        unclassifiable note is a signal that the template or
 *                        the routing table needs work.
 *
 * ---------------------------------------------------------------------------
 * HOW TO EXTEND IT
 * ---------------------------------------------------------------------------
 *
 * Add a row to ROUTES. The key is matched against `type:`, against `tags:`, and
 * (if you add one) a filename signal. The value is the destination folder,
 * created on demand. That is the whole extension point — one line for a new
 * category.
 *
 * To change WHERE a category lands, edit its ROUTES value. To change HOW a note
 * is recognised, add a rule to classify() at the right priority.
 *
 * ---------------------------------------------------------------------------
 * PORTED 2026-08-22 from PAI/Tools/ObsidianInboxRouter.ts
 * ---------------------------------------------------------------------------
 *
 * The original was orphaned twice over: it lived in the PAI tree (archived
 * 2026-08-21, so the hourly cron had been failing every hour), and it routed
 * into the PRE-RESTRUCTURE vault layout — `02 Cards`, `03 Spaces`, `04 VAULT`.
 * Two of those are now empty shells and the third has not been written to since
 * the restructure. Restoring it verbatim would have resumed filing captures
 * into folders that were deliberately emptied, silently, once an hour.
 *
 * The classification logic is preserved as-is; it was sound. What changed is
 * the vault path, the routing table, and the fallback (see DEFAULT above).
 *
 * HUMAN-FACING DOCS: `01 Thinking/Maps/Vault Guide.md` in the vault, section
 * "What happens to things you drop in the inbox". Keep the ROUTES table below
 * and that section in step — a doc that drifts from the code is worse than none.
 *
 * USAGE:
 *   bun ObsidianInboxRouter.ts            # route eligible files
 *   bun ObsidianInboxRouter.ts --dry-run  # report decisions, move nothing
 */

import { readdir, stat, readFile, rename, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import os from "os";

const HOME = process.env.HOME || os.homedir();
const LIFEOS_DIR = process.env.LIFEOS_DIR || join(HOME, ".claude", "LIFEOS");

/** Vault path comes from the single source of truth, never hardcoded. */
function vaultPath(): string {
  const cfg = join(LIFEOS_DIR, "USER", "INTEGRATIONS", "obsidian.yaml");
  try {
    const text = readFileSync(cfg, "utf8");
    const p = text.match(/^\s*path:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, "");
    if (p) return p;
  } catch {}
  return join(HOME, "obsidian");
}

const VAULT = vaultPath();
const INBOX = join(VAULT, "00 INBOX");
const STATE_FILE = join(LIFEOS_DIR, "MEMORY", "STATE", "inbox-router-state.json");
const LOG_FILE = join(LIFEOS_DIR, "MEMORY", "STATE", "inbox-router.log");
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2h grace — never move a note you're still editing
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Destination per category. Remapped 2026-08-22 onto the two-brain layout
 * (Vault Guide): 01 Thinking is atomic notes in Dom's own words, Sources/ is
 * other people's material worked up, Projects/ is operational.
 */
const ROUTES: Record<string, string> = {
  // Sources — someone else's material. NOT thinking.
  concept: join(VAULT, "Sources/YouTube"),   // source: youtube lands here
  web:     join(VAULT, "Sources/Articles"),
  clip:    join(VAULT, "Sources/Articles"),
  tool:    join(VAULT, "Sources/Lists"),     // bare link lists, pending a verdict

  // Thinking — Dom's own notes.
  note:    join(VAULT, "01 Thinking"),
  idea:    join(VAULT, "01 Thinking/Ideas"),
  quote:   join(VAULT, "01 Thinking/Quotes"),
  meeting: join(VAULT, "01 Thinking/Meetings"),
  person:  join(VAULT, "01 Thinking/People"),

  // Journal — dated, personal.
  capture: join(VAULT, "05 Journal/Thoughts"),
  voice:   join(VAULT, "05 Journal/Thoughts"),
  journal: join(VAULT, "05 Journal/Thoughts"),

  // Operational.
  work:    join(VAULT, "Projects/Work"),

  // Maps and indexes — navigation, not content.
  moc:     join(VAULT, "01 Thinking/Maps"),
  index:   join(VAULT, "01 Thinking/Maps"),

  // Unclassified — parked in view, never guessed into a real folder.
  default: join(VAULT, "00 INBOX/_unrouted"),
};

/**
 * Some inbox files are PARKED ON PURPOSE and referenced by their `00 INBOX/...`
 * path from elsewhere (PROJECTS.md open-asks, wiki links). Moving them silently
 * breaks those references.
 *
 * Caught by a dry run 2026-08-22: five TODO briefs carried `type: capture` and
 * would all have been filed into 05 Journal/Thoughts on the next hourly run,
 * breaking every path in PROJECTS.md. The grace period does not help — they
 * were up to 23h old.
 *
 * Two ways to pin a file: `status: pinned` / `router: skip` in frontmatter, or
 * a filename starting with `TODO` or `_`.
 */
function isPinned(filename: string, content: string): boolean {
  if (/^\s*(status:\s*pinned|router:\s*skip)\s*$/m.test(content)) return true;
  const base = filename.toLowerCase();
  return base.startsWith("todo") || base.startsWith("_");
}

function classify(filename: string, content: string): string {
  const lower = filename.toLowerCase();

  // 1. Source override — a YouTube capture is a source document whatever its type says.
  const sourceMatch = content.match(/^source:\s*(\S+)/m);
  if (sourceMatch && sourceMatch[1].toLowerCase().replace(/['"]/g, "") === "youtube") return "concept";

  // 2. Frontmatter type (case-insensitive key: handles `Type:` and `type:`).
  const typeMatch = content.match(/^[Tt]ype:\s*(\S+)/m);
  if (typeMatch) {
    const t = typeMatch[1].toLowerCase().replace(/['"]/g, "");
    if (t in ROUTES) return t;
  }

  // 3. Frontmatter tags.
  const tagsMatch = content.match(/^tags:\s*\[([^\]]+)\]/m);
  if (tagsMatch) {
    const tags = tagsMatch[1].toLowerCase();
    for (const key of Object.keys(ROUTES)) {
      if (key !== "default" && tags.includes(key)) return key;
    }
  }

  // 4. Filename signals.
  if (lower.startsWith("voice") || lower.includes("voice-capture") || lower.includes("voice memo")) return "voice";
  if (lower.includes("meeting") || lower.includes("standup") || lower.includes("1-1") || lower.includes("call with")) return "meeting";
  if (lower.includes("quote")) return "quote";
  if (lower.includes("idea")) return "idea";
  if (lower.includes("tool") || lower.includes("plugin")) return "tool";
  if (lower.includes("journal") || lower.includes("daily")) return "journal";

  // 5. Content signals — first 20 lines only.
  const preview = content.split("\n").slice(0, 20).join("\n").toLowerCase();
  if (preview.includes("attendees:") || preview.includes("action items")) return "meeting";
  // Weak signal: only trust a leading blockquote when the note declared no type
  // at all. A `type: index` note that opens with `>` is an index, not a quote.
  if (!typeMatch && preview.match(/^>\s+/m)) return "quote";

  return "default";
}

async function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    await mkdir(join(LIFEOS_DIR, "MEMORY", "STATE"), { recursive: true });
    await Bun.write(LOG_FILE, line, { append: true } as any);
  } catch {}
  process.stdout.write(line);
}

async function loadState(): Promise<Set<string>> {
  try {
    return new Set(JSON.parse(await readFile(STATE_FILE, "utf8")).processed || []);
  } catch {
    return new Set();
  }
}

async function saveState(processed: Set<string>) {
  await mkdir(join(LIFEOS_DIR, "MEMORY", "STATE"), { recursive: true });
  await Bun.write(STATE_FILE, JSON.stringify({ processed: [...processed], updated: new Date().toISOString() }, null, 2));
}

async function main() {
  if (!existsSync(INBOX)) {
    await log(`ABORT: inbox not found at ${INBOX}`);
    process.exit(1);
  }

  const now = Date.now();
  const processed = await loadState();
  let routed = 0, skippedYoung = 0, unrouted = 0, pinned = 0;

  for (const entry of await readdir(INBOX).catch(() => [] as string[])) {
    if (!entry.endsWith(".md")) continue;
    if (processed.has(entry)) continue;

    const filePath = join(INBOX, entry);
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) continue;

    if (now - fileStat.mtimeMs < MAX_AGE_MS) { skippedYoung++; continue; }

    const content = await readFile(filePath, "utf8").catch(() => "");

    if (isPinned(entry, content)) {
      pinned++;
      if (DRY_RUN) await log(`PINNED (left alone): "${entry}"`);
      continue;
    }

    const category = classify(entry, content);
    const dest = ROUTES[category];

    if (DRY_RUN) {
      await log(`DRY-RUN: "${entry}" → ${category} (${dest.replace(VAULT, "")})`);
      continue;
    }

    await mkdir(dest, { recursive: true });
    const destPath = join(dest, entry);
    if (existsSync(destPath)) { processed.add(entry); continue; }

    await rename(filePath, destPath);
    processed.add(entry);
    routed++;
    await log(`ROUTED: "${entry}" → ${category} (${dest.replace(VAULT, "")})`);

    if (category === "default") {
      unrouted++;
      // An unclassifiable note means the template or the routing table needs
      // work. Surface it rather than letting it rot in a folder nobody opens.
      fetch("http://localhost:31337/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Inbox router could not classify "${entry}" — it is parked in 00 INBOX/_unrouted` }),
      }).catch(() => {});
    }
  }

  if (!DRY_RUN) await saveState(processed);
  await log(`Run complete — ${routed} routed, ${unrouted} unclassified, ${pinned} pinned, ${skippedYoung} too recent`);
}

main().catch((err) => { console.error(err); process.exit(1); });
