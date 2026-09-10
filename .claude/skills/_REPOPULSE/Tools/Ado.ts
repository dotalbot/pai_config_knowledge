#!/usr/bin/env bun
/**
 * Azure DevOps REST client for RepoPulse.
 *
 * Deterministic plumbing so the model spends its budget on analysis rather than
 * re-deriving auth and pagination every run. Credentials come from
 * ~/.claude/.env (ADO_ORG, ADO_PAT) and are never printed.
 *
 * Every subcommand emits JSON on stdout so steps can pipe to jq.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API = "7.1-preview.1";

function loadEnv(): { org: string; pat: string } {
  // Read .env directly rather than relying on the shell having sourced it — a
  // bare `bun run` inherits nothing, and a silent undefined produces a
  // confusing 401 instead of a clear error.
  const path = join(homedir(), ".claude", ".env");
  let org = process.env.ADO_ORG ?? "";
  let pat = process.env.ADO_PAT ?? "";
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?(ADO_ORG|ADO_PAT)\s*=\s*(.*)$/);
      if (!m) continue;
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (m[1] === "ADO_ORG" && !org) org = val;
      if (m[1] === "ADO_PAT" && !pat) pat = val;
    }
  } catch {
    /* fall through to the check below */
  }
  if (!org || !pat) {
    console.error("REFUSED: ADO_ORG and ADO_PAT must be set in ~/.claude/.env");
    process.exit(1);
  }
  return { org, pat };
}

const { org, pat } = loadEnv();
const auth = "Basic " + Buffer.from(`:${pat}`).toString("base64");

async function get<T = any>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`https://dev.azure.com/${org}/${path}`);
  url.searchParams.set("api-version", API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (res.status === 401) {
    // The likeliest failure and the least obvious from a bare 401: the PAT
    // authenticates fine but lacks the scope for this particular resource.
    throw new Error(
      `401 on ${path} — PAT is valid but lacks scope for this resource. ` +
        `Code endpoints need Code (Read); work items need Work Items (Read).`,
    );
  }
  if (!res.ok) {
    throw new Error(`${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface Repo {
  id: string;
  name: string;
  project: { id: string; name: string };
  defaultBranch?: string;
  size?: number;
  isDisabled?: boolean;
  webUrl?: string;
}

export async function repos(): Promise<Repo[]> {
  const d = await get<{ value: Repo[] }>("_apis/git/repositories");
  return (d.value ?? []).sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
}

export interface Commit {
  id: string;
  author: string;
  date: string;
  comment: string;
  adds: number;
  edits: number;
  deletes: number;
}

export async function commits(repo: Repo, top = 500): Promise<Commit[]> {
  // searchCriteria.$top, NOT $top — the commits endpoint uses its own prefix
  // and silently ignores a plain $top, handing back the default page instead.
  const d = await get<{ value: any[] }>(
    `${repo.project.id}/_apis/git/repositories/${repo.id}/commits`,
    { "searchCriteria.$top": top },
  );
  return (d.value ?? []).map((c) => ({
    id: (c.commitId ?? "").slice(0, 8),
    author: c.author?.name ?? "",
    date: c.committer?.date ?? c.author?.date ?? "",
    comment: (c.comment ?? "").split("\n")[0].slice(0, 200),
    adds: c.changeCounts?.Add ?? 0,
    edits: c.changeCounts?.Edit ?? 0,
    deletes: c.changeCounts?.Delete ?? 0,
  }));
}

export async function pullRequests(repo: Repo, status = "all") {
  const d = await get<{ value: any[] }>(
    `${repo.project.id}/_apis/git/repositories/${repo.id}/pullrequests`,
    { "searchCriteria.status": status, $top: 200 },
  );
  return (d.value ?? []).map((p) => ({
    id: p.pullRequestId,
    title: (p.title ?? "").slice(0, 160),
    status: p.status,
    created: p.creationDate,
    closed: p.closedDate,
    by: p.createdBy?.displayName,
    reviewers: (p.reviewers ?? []).map((r: any) => r.displayName),
    source: (p.sourceRefName ?? "").replace("refs/heads/", ""),
    target: (p.targetRefName ?? "").replace("refs/heads/", ""),
  }));
}

export async function tree(repo: Repo, depth: "OneLevel" | "Full" = "OneLevel") {
  const d = await get<{ value: any[] }>(
    `${repo.project.id}/_apis/git/repositories/${repo.id}/items`,
    { recursionLevel: depth },
  );
  return (d.value ?? [])
    .map((i) => ({ path: i.path as string, folder: !!i.isFolder }))
    .filter((i) => i.path !== "/");
}

export async function file(repo: Repo, path: string): Promise<string> {
  const url = new URL(
    `https://dev.azure.com/${org}/${repo.project.id}/_apis/git/repositories/${repo.id}/items`,
  );
  url.searchParams.set("path", path);
  url.searchParams.set("api-version", API);
  url.searchParams.set("$format", "text");
  const res = await fetch(url, { headers: { Authorization: auth } });
  return res.ok ? res.text() : "";
}

export async function branches(repo: Repo) {
  const d = await get<{ value: any[] }>(
    `${repo.project.id}/_apis/git/repositories/${repo.id}/refs`,
    { filter: "heads/" },
  );
  return (d.value ?? []).map((r) => ({
    name: (r.name ?? "").replace("refs/heads/", ""),
    by: r.creator?.displayName ?? "",
  }));
}

/**
 * Identity normalisation. The same human commits under several spellings
 * ("thomas-capaldi" and "Thomas Capaldi"), which silently doubles the apparent
 * contributor count and halves each identity's share. Always fold before
 * counting.
 */
export function canonical(name: string): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

if (import.meta.main) {
  const [cmd, ...rest] = process.argv.slice(2);
  const out = (o: unknown) => console.log(JSON.stringify(o, null, 2));
  const find = async (name: string): Promise<Repo> => {
    const all = await repos();
    const r =
      all.find((x) => x.name.toLowerCase() === name.toLowerCase()) ??
      all.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
    if (!r) {
      console.error(`no repo matching "${name}"`);
      process.exit(1);
    }
    return r;
  };

  try {
    switch (cmd) {
      case "repos":
        out(await repos());
        break;
      case "commits":
        out(await commits(await find(rest[0]), Number(rest[1] ?? 500)));
        break;
      case "prs":
        out(await pullRequests(await find(rest[0]), rest[1] ?? "all"));
        break;
      case "tree":
        out(await tree(await find(rest[0]), (rest[1] as any) ?? "OneLevel"));
        break;
      case "file":
        console.log(await file(await find(rest[0]), rest[1]));
        break;
      case "branches":
        out(await branches(await find(rest[0])));
        break;
      default:
        console.log(
          "usage: Ado.ts repos | commits <repo> [n] | prs <repo> [status] | " +
            "tree <repo> [OneLevel|Full] | file <repo> <path> | branches <repo>",
        );
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
