#!/usr/bin/env bun
/**
 * AdoExcalidraw.ts — generate the Layer 1 / Layer 2 cockpit diagram.
 *
 * Dom's handwritten spec (2026-08-25, page 3): "big ticket items broken into
 * smaller ones… this is dynamic top down, reflecting points and information so
 * I can see it and drill to it."
 *
 * So: big blocks = live streams, sized and coloured by health; small blocks =
 * the epics/features inside them. Generated uncompressed (the Excalidraw plugin
 * reads both; compressed is only a storage optimisation) so it stays diffable
 * and regenerable.
 *
 * REGENERATED HOURLY — anything drawn by hand here is lost. Draw in a sibling
 * file and link to it instead.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";

const VAULT = `${homedir()}/obsidian`;
const OUT = `${VAULT}/03 Spaces/Work/Excalidraw/DevOps Cockpit (generated).excalidraw.md`;
const API = "api-version=7.1";
const LIVE = ["BAU", "GTM and capability build", "Client deliverables", "Client work",
              "Value", "Service design", "Customer zero", "AI and Copilot"];

function env(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const l of readFileSync(`${homedir()}/.claude/.env`, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return o;
}
const E = env(), ORG = E.ADO_ORG, PROJ = E.ADO_PROJECT, P = encodeURIComponent(E.ADO_PROJECT);
const H = { Authorization: "Basic " + Buffer.from(":" + E.ADO_PAT).toString("base64"), "Content-Type": "application/json" };
const OPEN = `[System.State] NOT IN ('Closed','Removed','Done')`;
const inArea = (a: string) => `[System.AreaPath] UNDER 'Digital solutions team\\${a}'`;

async function wiql(q: string): Promise<number[]> {
  const r = await fetch(`https://dev.azure.com/${ORG}/${P}/_apis/wit/wiql?${API}`,
    { method: "POST", headers: H, body: JSON.stringify({ query: q }), signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error(`WIQL ${r.status}`);
  return ((await r.json()).workItems ?? []).map((w: any) => w.id);
}
const count = async (w: string) => (await wiql(`SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject]=@project AND ${w}`)).length;
async function items(ids: number[]) {
  if (!ids.length) return [];
  const r = await fetch(`https://dev.azure.com/${ORG}/_apis/wit/workitems?ids=${ids.slice(0,200).join(",")}&fields=System.Title,System.State,System.WorkItemType,System.AreaPath&${API}`,
    { headers: H, signal: AbortSignal.timeout(40000) });
  return r.ok ? ((await r.json()).value ?? []) : [];
}

let seq = 0;
const id = () => `el${(++seq).toString().padStart(4, "0")}`;
const base = () => ({
  angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid",
  strokeWidth: 1, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [],
  frameId: null, roundness: { type: 3 }, seed: Math.floor(Math.random() * 1e6),
  version: 1, versionNonce: Math.floor(Math.random() * 1e6), isDeleted: false,
  boundElements: [], updated: Date.now(), link: null, locked: false,
});
const rect = (x: number, y: number, w: number, h: number, bg: string, stroke = "#1e1e1e") =>
  ({ ...base(), id: id(), type: "rectangle", x, y, width: w, height: h, backgroundColor: bg, strokeColor: stroke });
const text = (x: number, y: number, t: string, size = 16, colour = "#1e1e1e", w = 260) =>
  ({ ...base(), id: id(), type: "text", x, y, width: w, height: size * 1.25, text: t, originalText: t,
     fontSize: size, fontFamily: 2, textAlign: "left", verticalAlign: "top", strokeColor: colour,
     containerId: null, lineHeight: 1.25, baseline: size });

/** Health colour: green moving, amber mixed, red stalled. */
function colour(moving: number, open: number): string {
  const p = open ? moving / open : 0;
  return p >= 0.6 ? "#b2f2bb" : p >= 0.25 ? "#ffec99" : "#ffc9c9";
}

async function main() {
  const streams: any[] = [];
  for (const a of LIVE) {
    const open = await count(`${OPEN} AND ${inArea(a)}`);
    if (!open) continue;
    streams.push({ name: a, open,
      moving: await count(`${OPEN} AND ${inArea(a)} AND [System.ChangedDate] >= @today-30`),
      stale:  await count(`${OPEN} AND ${inArea(a)} AND [System.ChangedDate] < @today-180`) });
  }
  streams.sort((a, b) => b.open - a.open);

  const bigIds = await wiql(`SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject]=@project AND ${OPEN} ` +
    `AND (${LIVE.map(inArea).join(" OR ")}) AND [System.WorkItemType] IN ('Epic','Feature','Product') ORDER BY [System.ChangedDate] DESC`);
  const bigs = await items(bigIds);
  const inStream = (n: string) => bigs.filter((w: any) => (w.fields["System.AreaPath"] as string).split("\\")[1] === n);

  const els: any[] = [];
  els.push(text(40, 30, "DevOps Cockpit — live streams", 28));
  els.push(text(40, 70, `${PROJ} · ${streams.reduce((s, x) => s + x.open, 0)} open · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, 14, "#868e96", 620));

  let y = 130;
  for (const s of streams) {
    const kids = inStream(s.name).slice(0, 6);
    const h = Math.max(90, 46 + kids.length * 34);
    // Layer 1 — the big block
    els.push(rect(40, y, 300, h, colour(s.moving, s.open)));
    els.push(text(60, y + 16, s.name, 18));
    els.push(text(60, y + 44, `${s.open} open · ${s.moving} moving · ${s.stale} stale`, 13, "#495057"));
    // Layer 2 — the small blocks it connects to
    let ky = y + 8;
    for (const k of kids) {
      const f = k.fields, t = (f["System.Title"] ?? "").slice(0, 46);
      els.push(rect(400, ky, 420, 28, "#f8f9fa", "#adb5bd"));
      els.push(text(412, ky + 7, `${t}  · ${f["System.State"]}`, 12, "#343a40", 400));
      ky += 34;
    }
    if (!kids.length) els.push(text(400, y + 20, "task-level work only — no epics or features", 12, "#adb5bd", 380));
    y += h + 24;
  }

  const scene = {
    type: "excalidraw", version: 2, source: "LIFEOS/TOOLS/AdoExcalidraw.ts",
    elements: els, appState: { gridSize: null, viewBackgroundColor: "#ffffff" }, files: {},
  };

  const md = `---
excalidraw-plugin: parsed
tags: [excalidraw, cockpit, devops, generated]
generated: ${new Date().toISOString()}
---
==⚠ GENERATED — regenerated hourly by \`LIFEOS/TOOLS/AdoExcalidraw.ts\`. Hand edits are LOST. Draw in a sibling file and link to it. ⚠==

# Excalidraw Data

## Text Elements
${els.filter((e) => e.type === "text").map((e) => `${e.text} ^${e.id}`).join("\n")}

## Drawing
\`\`\`json
${JSON.stringify(scene, null, 1)}
\`\`\`
%%`;
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, md, "utf8");
  console.log(`wrote ${OUT}`);
  console.log(`  ${streams.length} streams, ${els.length} elements`);
}
main().catch((e) => { console.error("AdoExcalidraw failed:", e.message); process.exit(1); });
