/**
 * Regression suite for the Capture skill.
 *
 * Every test redirects BOTH the vault and the index into a temp tree. The two
 * must be redirected together: an earlier version threaded `vault` but let the
 * index fall back to the module default, and test fixtures leaked into the real
 * index — producing an anchor listing four notes that did not exist.
 *
 * Run: bun test skills/Capture/Tools/tests/
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { classify, extractUrl } from "../Classify.ts";
import { spliceGenerated, renderChildList, childrenOf, hasEarnedAnchor, anchorExists, regenerateAnchor, safeName } from "../Anchor.ts";
import { search, tokenise, ago } from "../Surface.ts";
import { isAsleep, parseDuration, rebuild, saveIndex, loadIndex } from "../Index.ts";
import { checkBoundary, renderNote } from "../Note.ts";
import { capture, digest, clusters, normalisePayload } from "../Capture.ts";
import { emptyIndex, GEN_START, GEN_END } from "../types.ts";
import type { IndexEntry } from "../types.ts";

let vault: string;
let indexPath: string;

beforeEach(async () => {
  vault = await mkdtemp(join(tmpdir(), "captest-"));
  indexPath = join(vault, "index.json");
});
afterEach(async () => {
  await rm(vault, { recursive: true, force: true });
});

const entry = (t: string, tags: string[], source?: string, captured = "2026-08-01"): IndexEntry => ({
  path: `Reference/YouTube/${t}.md`, title: t, kind: "video", medium: "youtube",
  source, tags, summary: `About ${tags.join(" ")}`, captured, status: "captured",
});

// ------------------------------------------------------------- classification

test("classifies every US-7 branch", () => {
  expect(classify("https://www.youtube.com/watch?v=abc").kind).toBe("video");
  expect(classify("https://youtu.be/abc").kind).toBe("video");
  expect(classify("https://youtube.com/shorts/abc").kind).toBe("video");
  expect(classify("https://youtube.com/@Handle").kind).toBe("channel");
  expect(classify("https://youtube.com/channel/UC123").kind).toBe("channel");
  expect(classify("https://github.com/org/repo").kind).toBe("tool");
  expect(classify("https://gitlab.com/org/repo").kind).toBe("tool");
  expect(classify("https://example.com/2026/a-post/").kind).toBe("article");
  expect(classify("example.com").kind).toBe("site");
  expect(classify("a thought with no url").kind).toBe("snippet");
  expect(classify("").kind).toBe("snippet");
});

test("explicit intent beats path structure", () => {
  expect(classify("this blog https://example.com/x").kind).toBe("site");
});

test("extractUrl handles trailing punctuation and bare domains", () => {
  expect(extractUrl("see https://example.com/a.")).toBe("https://example.com/a");
  expect(extractUrl("www.example.com")).toBe("https://example.com");
});

// -------------------------------------------------------------------- anchors

test("anchor is earned on the third item, not before", () => {
  const idx = emptyIndex();
  idx.entries = [entry("A", [], "Chan"), entry("B", [], "Chan")];
  expect(hasEarnedAnchor(idx, "Chan", "youtube")).toBe(false);
  idx.entries.push(entry("C", [], "Chan"));
  expect(hasEarnedAnchor(idx, "Chan", "youtube")).toBe(true);
});

test("explicit request bypasses the threshold", () => {
  expect(hasEarnedAnchor(emptyIndex(), "Any", "youtube", true)).toBe(true);
});

test("child matching is case-insensitive", () => {
  const idx = emptyIndex();
  idx.entries = [entry("A", [], "Philosophy Vibe")];
  expect(childrenOf(idx, "philosophy vibe", "youtube")).toHaveLength(1);
});

test("a channel and a site of the same name are separate namespaces", () => {
  // Regression (2026-09-10): "Vicky Zhao" existed as both a YouTube channel and
  // a site; each anchor listed the other's children, and the site anchor was
  // minted off a single article because the channel vouched for it.
  const idx = emptyIndex();
  const vid = { ...entry("A vid", [], "Vicky Zhao"), medium: "youtube" as const };
  const art = {
    ...entry("An article", [], "Vicky Zhao"),
    kind: "article" as const,
    medium: "web" as const,
  };
  idx.entries = [vid, art];

  expect(childrenOf(idx, "Vicky Zhao", "youtube").map((e) => e.title)).toEqual(["A vid"]);
  expect(childrenOf(idx, "Vicky Zhao", "site").map((e) => e.title)).toEqual(["An article"]);
});

test("an existing channel anchor does not vouch for a same-named site", () => {
  const idx = emptyIndex();
  idx.entries = [
    { ...entry("Vicky Zhao", [], undefined), kind: "channel" as const, medium: "youtube" as const },
  ];
  expect(anchorExists(idx, "Vicky Zhao", "youtube")).toBe(true);
  expect(anchorExists(idx, "Vicky Zhao", "site")).toBe(false);
  // and so one lone article must not earn a site anchor
  expect(hasEarnedAnchor(idx, "Vicky Zhao", "site")).toBe(false);
});

test("splice preserves content outside the fence", () => {
  const src = `## Videos\n\n${GEN_START}\n- [[Old]]\n${GEN_END}\n\nMy own words.`;
  const out = spliceGenerated(src, "Videos", "- [[New]]");
  expect(out).toContain("My own words.");
  expect(out).toContain("[[New]]");
  expect(out).not.toContain("[[Old]]");
});

test("splice is idempotent", () => {
  const src = `## Videos\n\n${GEN_START}\n- [[A]]\n${GEN_END}\n`;
  const once = spliceGenerated(src, "Videos", "- [[A]]");
  expect(spliceGenerated(once, "Videos", "- [[A]]")).toBe(once);
});

test("regeneration self-heals after a child is deleted", async () => {
  const idx = emptyIndex();
  idx.entries = [entry("A", [], "Chan"), entry("B", [], "Chan"), entry("C", [], "Chan")];
  const r1 = await regenerateAnchor(idx, { kind: "youtube", source: "Chan" }, vault);
  expect(r1.count).toBe(3);
  idx.entries = idx.entries.filter((e) => e.title !== "B");
  const r2 = await regenerateAnchor(idx, { kind: "youtube", source: "Chan" }, vault);
  const file = await readFile(join(vault, r2.path), "utf8");
  expect(file).not.toContain("[[B]]");
  expect(file).toContain("[[A]]");
});

test("regeneration is byte-identical on repeat", async () => {
  const idx = emptyIndex();
  idx.entries = [entry("A", [], "Chan")];
  const r = await regenerateAnchor(idx, { kind: "youtube", source: "Chan" }, vault);
  const first = await readFile(join(vault, r.path), "utf8");
  await regenerateAnchor(idx, { kind: "youtube", source: "Chan" }, vault);
  expect(await readFile(join(vault, r.path), "utf8")).toBe(first);
});

test("safeName strips path separators", () => {
  expect(safeName("a/b:c*d")).not.toContain("/");
});

// ------------------------------------------------------------------ surfacing

test("surfacing finds by tag and stays silent otherwise", () => {
  const idx = emptyIndex();
  idx.entries = [entry("Steel Man", ["steelman", "philosophy"])];
  expect(search(idx, "steelmanning an argument").length).toBe(1);
  expect(search(idx, "quantum chromodynamics").length).toBe(0);
  expect(search(idx, "the and of it").length).toBe(0);
});

test("short subject tokens survive tokenising", () => {
  // A length filter once dropped "ai", silently breaking every AI-related surface.
  expect(tokenise("ai")).toEqual(["ai"]);
  expect(tokenise("working on AI agents")).toContain("ai");
});

test("surfacing caps at three", () => {
  const idx = emptyIndex();
  idx.entries = Array.from({ length: 20 }, (_, i) => entry(`N${i}`, ["ai"]));
  expect(search(idx, "ai").length).toBe(3);
});

test("ago renders human intervals", () => {
  const now = new Date("2026-09-07");
  expect(ago("2026-09-07", now)).toBe("today");
  expect(ago("2026-09-04", now)).toBe("3 days ago");
  expect(ago("", now)).toBe("");
});

// ---------------------------------------------------------------------- sleep

test("sleep suppresses then lapses on its own", () => {
  const idx = emptyIndex();
  idx.sleep = { until: new Date(Date.now() + 3600_000).toISOString() };
  expect(isAsleep(idx)).toBe(true);
  idx.sleep = { until: new Date(Date.now() - 1000).toISOString() };
  expect(isAsleep(idx)).toBe(false);
  expect(isAsleep(emptyIndex())).toBe(false);
});

test("parseDuration accepts durations and rejects junk", () => {
  expect(parseDuration("2h")).toBe(7_200_000);
  expect(parseDuration("1d")).toBe(86_400_000);
  expect(parseDuration("soon")).toBeUndefined();
});

// ------------------------------------------------------------------- boundary

test("work domains are refused, personal allowed", () => {
  expect(checkBoundary("https://x.sharepoint.com/a").allowed).toBe(false);
  expect(checkBoundary("https://www.theinformteam.com/a").allowed).toBe(false);
  expect(checkBoundary("https://dev.azure.com/a").allowed).toBe(false);
  expect(checkBoundary("https://simonwillison.net/a").allowed).toBe(true);
  expect(checkBoundary(undefined).allowed).toBe(true);
});

test("refused capture writes nothing", async () => {
  const r = await capture(
    { title: "Doc", kind: "article", medium: "web", url: "https://x.sharepoint.com/a", tags: [], summary: "" },
    vault, indexPath,
  );
  expect(r.refused).toBeDefined();
  expect(r.note).toBe("");
  expect(await readdir(join(vault, "Reference")).catch(() => [])).toHaveLength(0);
});

// ------------------------------------------------------------ notes and index

test("note carries no processing checkbox", () => {
  const md = renderNote({ title: "T", kind: "article", medium: "web", tags: ["a"], summary: "s" });
  expect(md).not.toContain("- [ ]");
  expect(md).toContain("type: reference");
});

test("duplicate titles are suffixed, never overwritten", async () => {
  const payload = { title: "Same", kind: "article" as const, medium: "web" as const, tags: ["a"], summary: "s" };
  const a = await capture(payload, vault, indexPath);
  const b = await capture(payload, vault, indexPath);
  expect(a.note).not.toBe(b.note);
  expect(b.note).toContain("(2)");
});

test("rebuild drops missing notes, keeps sleep, and is idempotent", async () => {
  const a = await capture(
    { title: "Keep", kind: "article", medium: "web", tags: ["x"], summary: "s" }, vault, indexPath);
  const b = await capture(
    { title: "Drop", kind: "article", medium: "web", tags: ["x"], summary: "s" }, vault, indexPath);
  await rm(join(vault, b.note));

  const prev = await loadIndex(indexPath);
  prev.sleep = { until: new Date(Date.now() + 3600_000).toISOString() };
  const r1 = await rebuild(join(vault, "Reference"), vault, prev);
  expect(r1.entries.some((e) => e.path === a.note)).toBe(true);
  expect(r1.entries.some((e) => e.path === b.note)).toBe(false);
  expect(r1.sleep).toBeDefined();

  const r2 = await rebuild(join(vault, "Reference"), vault, r1);
  expect(JSON.stringify(r2.entries)).toBe(JSON.stringify(r1.entries));
});

test("index writes stay inside the temp tree", async () => {
  await capture({ title: "T", kind: "article", medium: "web", tags: ["a"], summary: "s" }, vault, indexPath);
  expect(await Bun.file(indexPath).exists()).toBe(true);
  expect(await readdir(vault)).not.toContain(".obsidian");
});

test("breadcrumb never points at an anchor that does not exist", async () => {
  // Found in live use 2026-09-07: the first capture from a channel linked
  // [[Vicky Zhao]], an anchor the source had not yet earned.
  const first = await capture(
    { title: "V1", kind: "video", medium: "youtube", source: "Chan", tags: ["a"], summary: "s" },
    vault, indexPath);
  expect(await readFile(join(vault, first.note), "utf8")).toContain("[[Reference/README|Reference]]");

  await capture({ title: "V2", kind: "video", medium: "youtube", source: "Chan", tags: ["a"], summary: "s" }, vault, indexPath);
  const third = await capture(
    { title: "V3", kind: "video", medium: "youtube", source: "Chan", tags: ["a"], summary: "s" },
    vault, indexPath);
  // The third earns the anchor, so it may point at it — path-qualified, since a
  // bare [[Chan]] resolves by basename and would be ambiguous once a channel and
  // a site share a name.
  const body = await readFile(join(vault, third.note), "utf8");
  expect(body).toContain("[[Reference/Channels/Chan|Chan]]");
  expect(body).not.toMatch(/⬆️:: \[\[Chan\]\]/);
});

test("breadcrumbs are path-qualified per medium, so same-named anchors never collide", async () => {
  // A channel and a site both called "Dual" must send their children to
  // different files (regression for the basename-resolution bug, 2026-09-10).
  for (const t of ["V1", "V2", "V3"]) {
    await capture({ title: t, kind: "video", medium: "youtube", source: "Dual", tags: ["a"], summary: "s" }, vault, indexPath);
  }
  for (const t of ["A1", "A2", "A3"]) {
    await capture({ title: t, kind: "article", medium: "web", source: "Dual", tags: ["a"], summary: "s" }, vault, indexPath);
  }
  const vid = await readFile(join(vault, "Reference/YouTube/V3.md"), "utf8");
  const art = await readFile(join(vault, "Reference/Web/A3.md"), "utf8");
  expect(vid).toContain("[[Reference/Channels/Dual|Dual]]");
  expect(art).toContain("[[Reference/Sites/Dual|Dual]]");
});

// -------------------------------------------------------------------- digest

test("digest carries no guilt language", async () => {
  await capture({ title: "T", kind: "article", medium: "web", tags: ["ai"], summary: "s" }, vault, indexPath);
  const d = digest(await loadIndex(indexPath));
  expect(d).not.toMatch(/backlog|overdue|unprocessed|owe\b|should/i);
});

test("clusters need three items to appear", () => {
  const idx = emptyIndex();
  idx.entries = [entry("A", ["t"]), entry("B", ["t"])];
  expect(clusters(idx)).toHaveLength(0);
  idx.entries.push(entry("C", ["t"]));
  expect(clusters(idx)[0]?.tag).toBe("t");
});

// --------------------------------------------------- payload validation (2026-09-07)
// Both defects below reached the live vault: a capture reported success while
// writing `medium: undefined` into frontmatter, and three videos from one
// channel each indexed with source=null, so the anchor threshold saw 1, not 3.

test("normalisePayload infers medium from kind rather than writing undefined", () => {
  const { input, warnings } = normalisePayload({
    title: "A Video", kind: "video", tags: ["x"], summary: "s",
  });
  expect(input.medium).toBe("youtube");
  expect(warnings.some((w) => w.includes("medium"))).toBe(true);
});

test("normalisePayload never yields a medium that renders as the string undefined", () => {
  const { input } = normalisePayload({
    title: "A Video", kind: "video", tags: ["x"], summary: "s",
  });
  expect(renderNote(input)).not.toContain("medium: undefined");
});

test("normalisePayload infers source from author for a video, so anchors count", () => {
  const { input, warnings } = normalisePayload({
    title: "Turn Any Book Into an AI Skill",
    kind: "video", author: "Vicky Zhao", tags: ["ai"], summary: "s",
  });
  expect(input.source).toBe("Vicky Zhao");
  expect(warnings.some((w) => w.includes("source"))).toBe(true);
});

test("inferred source makes sibling videos count toward one anchor", () => {
  const mk = (title: string) => {
    const { input } = normalisePayload({
      title, kind: "video", author: "Vicky Zhao", tags: ["ai"], summary: "s",
    });
    return {
      path: `Reference/YouTube/${title}.md`, title, kind: input.kind,
      medium: input.medium, source: input.source, tags: input.tags,
      summary: "s", captured: "2026-09-07", status: "captured",
    } as IndexEntry;
  };
  const index = { ...emptyIndex(), entries: [mk("One"), mk("Two"), mk("Three")] };
  expect(childrenOf(index, "Vicky Zhao", "youtube").length).toBe(3);
  expect(hasEarnedAnchor(index, "Vicky Zhao", "youtube")).toBe(true);
});

test("normalisePayload explicitly warns when a video has no source at all", () => {
  const { input, warnings } = normalisePayload({
    title: "Orphan", kind: "video", tags: ["x"], summary: "s",
  });
  expect(input.source).toBeUndefined();
  expect(warnings.some((w) => w.includes("will not count"))).toBe(true);
});

test("normalisePayload rejects unrecoverable payloads loudly", () => {
  expect(() => normalisePayload({ kind: "video", tags: [], summary: "s" })).toThrow(/title/);
  expect(() => normalisePayload({ title: "T", kind: "movie", tags: [], summary: "s" })).toThrow(/kind/);
  expect(() => normalisePayload({ title: "T", kind: "video", medium: "vhs", tags: [], summary: "s" })).toThrow(/medium/);
  expect(() => normalisePayload({ title: "T", kind: "video", summary: "s" })).toThrow(/tags/);
  expect(() => normalisePayload("not an object")).toThrow(/object/);
});

// ------------------------------------------------- rich capture format (2026-09-07)
// Modelled on the Sources/YouTube capture skeleton. Thin captures must still
// render, so every rich field is optional.

const richInput = {
  title: "A Talk", kind: "video" as const, medium: "youtube" as const,
  url: "https://youtu.be/x", tags: ["t"], summary: "It argues a thing.",
  takeaways: ["First point"], quotes: ["Exactly what was said"],
  bestIdeas: ["An idea"], tools: ["Obsidian — for notes"],
  method: ["Step one"], keyMessage: "The one thing.",
  mindmap: "mindmap\n  root((X))",
};

test("rich capture renders every section with headings", () => {
  const md = renderNote(richInput);
  for (const h of ["## Summary", "## Key Takeaways", "## Mindmap", "## Notable Quotes",
                   "## Best Ideas", "## Tools", "## Method", "## Key Message"]) {
    expect(md).toContain(h);
  }
  expect(md).toContain("```mermaid");
  expect(md).toContain("> Exactly what was said");
});

test("rich capture seeds the Thinking-notes heading but never fills it", () => {
  const md = renderNote(richInput);
  expect(md).toContain("## ⬇️ Thinking notes from this source");
  // The skill must not author Dom's own words.
  expect(md).toContain("_Atomic notes in my own words that came out of this._");
});

test("thin capture stays a plain paragraph with no rich headings", () => {
  const md = renderNote({
    title: "Thin", kind: "video", medium: "youtube", tags: ["t"], summary: "Short.",
  });
  expect(md).not.toContain("## Summary");
  expect(md).not.toContain("## Key Takeaways");
  expect(md).not.toContain("Thinking notes from this source");
  expect(md).toContain("Short.");
});

test("normalisePayload carries rich fields through and drops non-strings", () => {
  const { input } = normalisePayload({
    title: "T", kind: "video", medium: "youtube", tags: ["t"], summary: "s",
    takeaways: ["real", 42, "", "  also real  "], quotes: [], keyMessage: "km",
  });
  expect(input.takeaways).toEqual(["real", "also real"]);
  expect(input.quotes).toBeUndefined();   // empty array -> undefined, not a bare heading
  expect(input.keyMessage).toBe("km");
});

// ------------------------------------------- capturing an anchor kind (2026-09-07)
// Capturing a channel URL directly wrote `site:` and produced no generated fence,
// because both paths assumed "channel" was only ever a child's parent, never a
// captured kind in its own right.

test("a captured channel names itself with channel:, not site:", () => {
  const md = renderNote({
    title: "The Next New Thing", kind: "channel", medium: "youtube",
    source: "The Next New Thing", tags: ["AI"], summary: "s",
  });
  expect(md).toContain("channel: The Next New Thing");
  expect(md).not.toContain("site: The Next New Thing");
});

test("a captured site still names itself with site:", () => {
  const md = renderNote({
    title: "example.com", kind: "site", medium: "web",
    source: "example.com", tags: ["x"], summary: "s",
  });
  expect(md).toContain("site: example.com");
});
