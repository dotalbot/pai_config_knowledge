#!/usr/bin/env bun
/**
 * How the Azure DevOps org itself is set up — the layer above the repos.
 *
 * Boards, pipelines, branch policies, service connections and teams say more
 * about how an organisation actually works than commit counts do: they are the
 * rules the work has to move through. This tool reads that configuration, and
 * reports plainly when a scope is missing rather than guessing.
 *
 *   bun run Estate.ts probe     # which areas the PAT can actually read
 *   bun run Estate.ts setup     # full picture: projects, pipelines, policies, teams
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API = "7.1-preview.1";

function loadEnv() {
  const path = join(homedir(), ".claude", ".env");
  let org = process.env.ADO_ORG ?? "";
  let pat = process.env.ADO_PAT ?? "";
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?(ADO_ORG|ADO_PAT)\s*=\s*(.*)$/);
      if (!m) continue;
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      if (m[1] === "ADO_ORG" && !org) org = v;
      if (m[1] === "ADO_PAT" && !pat) pat = v;
    }
  } catch {}
  if (!org || !pat) {
    console.error("REFUSED: ADO_ORG and ADO_PAT must be set in ~/.claude/.env");
    process.exit(1);
  }
  return { org, pat };
}

const { org, pat } = loadEnv();
const auth = "Basic " + Buffer.from(`:${pat}`).toString("base64");

/** Returns null on 401/403 so a missing scope degrades instead of throwing. */
async function tryGet<T = any>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T | null> {
  const url = new URL(`https://dev.azure.com/${org}/${path}`);
  url.searchParams.set("api-version", API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function projects() {
  const d = await tryGet<{ value: any[] }>("_apis/projects");
  return (d?.value ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    visibility: p.visibility,
    lastUpdate: p.lastUpdateTime,
  }));
}

/** The areas worth knowing about, and the PAT scope each one needs. */
const AREAS: { key: string; path: (p: string) => string; scope: string }[] = [
  { key: "buildDefinitions", path: (p) => `${p}/_apis/build/definitions`, scope: "Build (Read)" },
  { key: "recentBuilds", path: (p) => `${p}/_apis/build/builds`, scope: "Build (Read)" },
  { key: "releaseDefinitions", path: (p) => `${p}/_apis/release/definitions`, scope: "Release (Read)" },
  { key: "policies", path: (p) => `${p}/_apis/policy/configurations`, scope: "Code (Read)" },
  { key: "serviceEndpoints", path: (p) => `${p}/_apis/serviceendpoint/endpoints`, scope: "Service Connections (Read)" },
  { key: "teams", path: (p) => `_apis/projects/${p}/teams`, scope: "Project and Team (Read)" },
  { key: "workItemTypes", path: (p) => `${p}/_apis/wit/workitemtypes`, scope: "Work Items (Read)" },
  { key: "queries", path: (p) => `${p}/_apis/wit/queries`, scope: "Work Items (Read)" },
  { key: "iterations", path: (p) => `${p}/_apis/work/teamsettings/iterations`, scope: "Work Items (Read)" },
];

export async function probe() {
  const ps = await projects();
  const rows: any[] = [];
  for (const p of ps) {
    for (const a of AREAS) {
      const d = await tryGet<any>(a.path(p.id));
      rows.push({
        project: p.name,
        area: a.key,
        ok: d !== null,
        count: d?.count ?? (Array.isArray(d?.value) ? d.value.length : null),
        needs: a.scope,
      });
    }
  }
  return rows;
}

export async function setup() {
  const ps = await projects();
  const out: any = { org, projects: [] };
  for (const p of ps) {
    const [builds, recent, policies, endpoints, teams, wits, iterations] = await Promise.all([
      tryGet<any>(`${p.id}/_apis/build/definitions`),
      tryGet<any>(`${p.id}/_apis/build/builds`, { $top: 100 }),
      tryGet<any>(`${p.id}/_apis/policy/configurations`),
      tryGet<any>(`${p.id}/_apis/serviceendpoint/endpoints`),
      tryGet<any>(`_apis/projects/${p.id}/teams`),
      tryGet<any>(`${p.id}/_apis/wit/workitemtypes`),
      tryGet<any>(`${p.id}/_apis/work/teamsettings/iterations`),
    ]);

    out.projects.push({
      name: p.name,
      description: p.description,
      visibility: p.visibility,
      lastUpdate: p.lastUpdate,
      pipelines:
        builds?.value?.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.process?.type === 2 ? "yaml" : "classic",
          yamlPath: b.process?.yamlFilename ?? null,
          repo: b.repository?.name ?? null,
          queueStatus: b.queueStatus,
          path: b.path,
        })) ?? null,
      recentBuildCount: recent?.count ?? null,
      recentBuilds:
        recent?.value?.slice(0, 25).map((b: any) => ({
          def: b.definition?.name,
          result: b.result,
          reason: b.reason,
          finished: b.finishTime,
          by: b.requestedFor?.displayName,
          branch: (b.sourceBranch ?? "").replace("refs/heads/", ""),
        })) ?? null,
      // Branch policies are the real "how work must flow" signal: a required
      // reviewer policy is process, an empty list means convention only.
      branchPolicies:
        policies?.value
          ?.filter((c: any) => c.isEnabled)
          .map((c: any) => ({
            type: c.type?.displayName,
            blocking: c.isBlocking,
            repo: c.settings?.scope?.[0]?.repositoryId ?? "all",
            branch: (c.settings?.scope?.[0]?.refName ?? "").replace("refs/heads/", ""),
            minReviewers: c.settings?.minimumApproverCount ?? null,
            selfApprove: c.settings?.creatorVoteCounts ?? null,
          })) ?? null,
      serviceConnections:
        endpoints?.value?.map((e: any) => ({ name: e.name, type: e.type })) ?? null,
      teams: teams?.value?.map((t: any) => t.name) ?? null,
      workItemTypes: wits?.value?.map((w: any) => w.name) ?? null,
      iterations:
        iterations?.value?.map((i: any) => ({
          name: i.name,
          start: i.attributes?.startDate,
          finish: i.attributes?.finishDate,
        })) ?? null,
    });
  }
  return out;
}

if (import.meta.main) {
  const cmd = process.argv[2];
  if (cmd === "probe") {
    const rows = await probe();
    for (const r of rows) {
      const mark = r.ok ? "OK  " : "DENIED";
      const n = r.count === null || r.count === undefined ? "" : `(${r.count})`;
      console.log(
        `${mark.padEnd(7)} ${String(r.project).slice(0, 26).padEnd(28)} ${r.area.padEnd(20)} ${n.padEnd(7)} ${r.ok ? "" : "needs " + r.needs}`,
      );
    }
  } else if (cmd === "setup") {
    console.log(JSON.stringify(await setup(), null, 2));
  } else {
    console.log("usage: Estate.ts probe | setup");
  }
}
