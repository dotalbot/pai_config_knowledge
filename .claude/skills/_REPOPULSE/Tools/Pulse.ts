#!/usr/bin/env bun
/**
 * Activity metrics across every repo in the org.
 *
 * The point of doing this in code rather than by eye: identity folding and
 * date bucketing are exactly the things that go quietly wrong when a model
 * eyeballs a commit list, and they are what every conclusion about "who works
 * where" rests on.
 *
 *   bun run Pulse.ts scan            # all repos, activity + contributors
 *   bun run Pulse.ts repo <name>     # one repo in depth
 */

import { repos, commits, pullRequests, tree, canonical, type Repo } from "./Ado.ts";

const DAY = 86_400_000;
const days = (iso: string) => (Date.now() - new Date(iso).getTime()) / DAY;

export interface RepoPulse {
  name: string;
  project: string;
  sizeMB: number;
  empty: boolean;
  lastCommit: string | null;
  daysSince: number | null;
  commitCount: number;
  /** Commits in the trailing 30 and 90 days, from the sampled window. */
  last30: number;
  last90: number;
  contributors: { name: string; commits: number; share: number }[];
  soleOwner: string | null;
  prCount: number;
  reviewedPRs: number;
  topLevel: string[];
  agentFiles: string[];
}

/** Fold commit-author spellings onto one display name (most frequent wins). */
function foldAuthors(list: { author: string }[]) {
  const groups = new Map<string, Map<string, number>>();
  for (const c of list) {
    const key = canonical(c.author);
    if (!key) continue;
    const g = groups.get(key) ?? new Map<string, number>();
    g.set(c.author, (g.get(c.author) ?? 0) + 1);
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([, spellings]) => {
      const total = [...spellings.values()].reduce((a, b) => a + b, 0);
      const display = [...spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { name: display, commits: total };
    })
    .sort((a, b) => b.commits - a.commits);
}

/** Files that indicate agent-assisted development is established practice. */
const AGENT_MARKERS = ["CLAUDE.md", ".claude", "GEMINI.md", ".cursorrules", "AGENTS.md", "copilot-instructions.md"];

export async function pulseOf(r: Repo): Promise<RepoPulse> {
  const empty = !r.defaultBranch;
  const base: RepoPulse = {
    name: r.name,
    project: r.project.name,
    sizeMB: +(((r.size ?? 0) / 1048576).toFixed(2)),
    empty,
    lastCommit: null,
    daysSince: null,
    commitCount: 0,
    last30: 0,
    last90: 0,
    contributors: [],
    soleOwner: null,
    prCount: 0,
    reviewedPRs: 0,
    topLevel: [],
    agentFiles: [],
  };
  if (empty) return base;

  const [cs, prs, items] = await Promise.all([
    commits(r, 500).catch(() => []),
    pullRequests(r).catch(() => []),
    tree(r).catch(() => []),
  ]);

  const dated = cs.filter((c) => c.date);
  const folded = foldAuthors(dated);
  const total = folded.reduce((a, b) => a + b.commits, 0) || 1;

  base.commitCount = dated.length;
  base.lastCommit = dated.length ? dated.map((c) => c.date).sort().at(-1)! : null;
  base.daysSince = base.lastCommit ? Math.floor(days(base.lastCommit)) : null;
  base.last30 = dated.filter((c) => days(c.date) <= 30).length;
  base.last90 = dated.filter((c) => days(c.date) <= 90).length;
  base.contributors = folded.map((f) => ({
    ...f,
    share: +((f.commits / total) * 100).toFixed(1),
  }));
  // A repo one person wrote almost all of is a knowledge-concentration risk,
  // which is a different finding from a repo that is merely quiet.
  base.soleOwner =
    base.contributors.length > 0 && base.contributors[0].share >= 90
      ? base.contributors[0].name
      : null;
  base.prCount = prs.length;
  base.reviewedPRs = prs.filter((p) => (p.reviewers?.length ?? 0) > 0).length;
  base.topLevel = items.map((i) => i.path.replace(/^\//, "")).sort();
  base.agentFiles = base.topLevel.filter((p) =>
    AGENT_MARKERS.some((m) => p.toLowerCase() === m.toLowerCase()),
  );
  return base;
}

export async function scan(): Promise<RepoPulse[]> {
  const all = await repos();
  const out: RepoPulse[] = [];
  // Serial on purpose: ADO throttles aggressively on burst parallel reads.
  for (const r of all) out.push(await pulseOf(r));
  return out.sort((a, b) => (a.daysSince ?? 1e9) - (b.daysSince ?? 1e9));
}

if (import.meta.main) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "scan") {
    console.log(JSON.stringify(await scan(), null, 2));
  } else if (cmd === "repo") {
    const all = await repos();
    const r =
      all.find((x) => x.name.toLowerCase() === rest[0]?.toLowerCase()) ??
      all.find((x) => x.name.toLowerCase().includes((rest[0] ?? "").toLowerCase()));
    if (!r) {
      console.error(`no repo matching "${rest[0]}"`);
      process.exit(1);
    }
    console.log(JSON.stringify(await pulseOf(r), null, 2));
  } else {
    console.log("usage: Pulse.ts scan | repo <name>");
  }
}
