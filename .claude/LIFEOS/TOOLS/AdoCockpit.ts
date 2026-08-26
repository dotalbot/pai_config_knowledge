#!/usr/bin/env bun
/**
 * AdoCockpit.ts — Azure DevOps workspace health, rendered into Obsidian.
 *
 * v2 (2026-08-25). v1 rendered 13 epics grouped by tag. That showed the
 * STRUCTURE, which the 2026-08-11 Operating View analysis says is the part
 * already working. It said nothing about the part that is not: stale work,
 * unowned work, and where attention actually goes.
 *
 * Design decisions, all from evidence rather than assumption:
 *  - LAYER 1 = the eight LIVE area paths, not the analysis's editorial "five
 *    streams" (there are 32 area paths) and not the OKR-sounding paths
 *    (Delighted Customers etc — 15 items, all Done, a dead 2023 layer).
 *  - LEGACY areas are collapsed and excluded from live counts. Dom's ruling
 *    2026-08-25: not work needed now, back only if Erica raises them.
 *  - READ-ONLY. There is no write path to ADO in this file.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";

const VAULT = `${homedir()}/obsidian`;
const OUT = `${VAULT}/02 Doing/Cockpit/DevOps Roadmap.md`;
const API = "api-version=7.1";

/** Live streams — Dom's "big blocks". Verified non-zero open work 2026-08-25. */
const LIVE = ["BAU", "GTM and capability build", "Client deliverables", "Client work",
              "Value", "Service design", "Customer zero", "AI and Copilot"];
/** Legacy — Dom's ruling. Shown collapsed, never mixed with live counts. */
const LEGACY = ["Autobots", "Compliance and cyber", "Copilot adoption",
                "Copilot agents", "Agent Log Lords"];

function env(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const l of readFileSync(`${homedir()}/.claude/.env`, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return o;
}
const E = env(), ORG = E.ADO_ORG, PROJ = E.ADO_PROJECT;
if (!ORG || !E.ADO_PAT) { console.error("ADO_ORG/ADO_PAT missing — run SetAdoCreds.sh"); process.exit(1); }
const H = { Authorization: "Basic " + Buffer.from(":" + E.ADO_PAT).toString("base64"),
            "Content-Type": "application/json" };
const P = encodeURIComponent(PROJ);
const OPEN = `[System.State] NOT IN ('Closed','Removed','Done')`;

async function wiql(q: string): Promise<number[]> {
  const r = await fetch(`https://dev.azure.com/${ORG}/${P}/_apis/wit/wiql?${API}`,
    { method: "POST", headers: H, body: JSON.stringify({ query: q }), signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error(`WIQL ${r.status}`);
  return ((await r.json()).workItems ?? []).map((w: any) => w.id);
}
const inArea = (a: string) => `[System.AreaPath] UNDER 'Digital solutions team\\${a}'`;
const count = async (where: string) =>
  (await wiql(`SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject]=@project AND ${where}`)).length;

async function items(ids: number[]): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const url = `https://dev.azure.com/${ORG}/_apis/wit/workitems?ids=${ids.slice(i, i + 200).join(",")}` +
      `&fields=System.Title,System.State,System.WorkItemType,System.AssignedTo,System.ChangedDate,System.AreaPath&${API}`;
    const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(40000) });
    if (!r.ok) throw new Error(`items ${r.status}`);
    out.push(...((await r.json()).value ?? []));
  }
  return out;
}

const bar = (n: number, total: number) => {
  if (!total) return "—";
  const f = Math.round((n / total) * 10);
  return `\`${"█".repeat(f)}${"░".repeat(10 - f)}\``;
};

async function main() {
  const liveWhere = LIVE.map(inArea).join(" OR ");
  const totals = {
    open:    await count(`${OPEN} AND (${liveWhere})`),
    stale:   await count(`${OPEN} AND (${liveWhere}) AND [System.ChangedDate] < @today-180`),
    unowned: await count(`${OPEN} AND (${liveWhere}) AND [System.AssignedTo] = ''`),
    recent:  await count(`${OPEN} AND (${liveWhere}) AND [System.ChangedDate] >= @today-30`),
    legacy:  await count(`${OPEN} AND (${LEGACY.map(inArea).join(" OR ")})`),
  };

  // Per-stream health
  const streams: any[] = [];
  for (const a of LIVE) {
    const open = await count(`${OPEN} AND ${inArea(a)}`);
    if (!open) continue;
    streams.push({
      name: a, open,
      stale:   await count(`${OPEN} AND ${inArea(a)} AND [System.ChangedDate] < @today-180`),
      unowned: await count(`${OPEN} AND ${inArea(a)} AND [System.AssignedTo] = ''`),
      moving:  await count(`${OPEN} AND ${inArea(a)} AND [System.ChangedDate] >= @today-30`),
    });
  }
  streams.sort((a, b) => b.open - a.open);

  // Layer 2 — the epics/features inside each live stream, for drill-down.
  const bigIds = await wiql(
    `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject]=@project AND ${OPEN} AND (${liveWhere}) ` +
    `AND [System.WorkItemType] IN ('Epic','Feature','Product') ORDER BY [System.ChangedDate] DESC`);
  const bigs = await items(bigIds);
  const byArea = new Map<string, any[]>();
  for (const w of bigs) {
    const top = (w.fields["System.AreaPath"] as string).split("\\")[1] ?? "—";
    if (!byArea.has(top)) byArea.set(top, []);
    byArea.get(top)!.push(w);
  }

  const now = new Date().toISOString();
  const pct = (n: number) => totals.open ? Math.round((n / totals.open) * 100) : 0;
  const L: string[] = [
    "---", "title: DevOps Roadmap", "type: cockpit", `date: ${now.slice(0, 10)}`,
    `generated: ${now}`, "source: azure-devops", "tags: [cockpit, devops, roadmap]", "---", "",
    "> [!warning] Generated file — do not edit",
    "> Rendered by `LIFEOS/TOOLS/AdoCockpit.ts`, hourly. Read-only: nothing is",
    "> written back to Azure DevOps. Edits here are overwritten.", "",
    "# DevOps Roadmap", "",
    `**${ORG} / ${PROJ}** · refreshed ${now.slice(0, 16).replace("T", " ")}`, "",
    "## Workspace health", "",
    "| | Count | Share |", "|---|---:|---:|",
    `| **Open (live streams)** | ${totals.open} | — |`,
    `| Moving (touched < 30d) | ${totals.recent} | ${pct(totals.recent)}% |`,
    `| Stale (untouched > 180d) | ${totals.stale} | ${pct(totals.stale)}% |`,
    `| No owner | ${totals.unowned} | ${pct(totals.unowned)}% |`,
    `| *Legacy (excluded above)* | *${totals.legacy}* | — |`, "",
    "## Layer 1 — the streams", "",
    "| Stream | Open | Moving | Stale | No owner | Health |",
    "|---|---:|---:|---:|---:|---|",
  ];
  for (const s of streams) {
    L.push(`| **${s.name}** | ${s.open} | ${s.moving} | ${s.stale} | ${s.unowned} | ${bar(s.moving, s.open)} |`);
  }
  L.push("", "*Health bar = share of open work touched in the last 30 days.*", "");

  L.push("## Layer 2 — what is inside each stream", "");
  for (const s of streams) {
    const ws = (byArea.get(s.name) ?? []).slice(0, 12);
    L.push(`### ${s.name}`, "");
    if (!ws.length) { L.push("*No open epics, features or products — task-level work only.*", ""); continue; }
    L.push("| Item | Type | State | Owner | Last touched |", "|---|---|---|---|---|");
    for (const w of ws) {
      const f = w.fields, who = (f["System.AssignedTo"] ?? {})?.displayName ?? "—";
      const title = (f["System.Title"] ?? "").replace(/\|/g, "\\|").slice(0, 58);
      L.push(`| [${title}](https://dev.azure.com/${ORG}/${P}/_workitems/edit/${w.id}) | ${f["System.WorkItemType"]} | ${f["System.State"]} | ${who} | ${f["System.ChangedDate"].slice(0, 10)} |`);
    }
    L.push("");
  }

  L.push("## Legacy — parked, not live", "",
    "> Dom's ruling 2026-08-25: not work needed at the moment. Back only if Erica",
    "> brings them forward. Excluded from every count above.", "",
    LEGACY.map((a) => `- ${a}`).join("\n"), "",
    "## Drill-down", "",
    "> Each stream earns its own Excalidraw when it needs one:",
    "> `03 Spaces/Work/Excalidraw/<stream>.excalidraw.md`", "");

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(`wrote ${OUT}`);
  console.log(`  ${streams.length} live streams · ${totals.open} open · ${totals.stale} stale · ${totals.unowned} unowned · ${totals.legacy} legacy`);
}
main().catch((e) => { console.error("AdoCockpit failed:", e.message); process.exit(1); });
