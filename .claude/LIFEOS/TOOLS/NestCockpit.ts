#!/usr/bin/env bun
/**
 * NestCockpit.ts — cockpit for "ADD - The Digital NEST", the current nucleus.
 *
 * v1 of the cockpit rendered workspace health across 32 area paths. Dom's
 * feedback: that was the wrong instrument. He wants a map of the work actually
 * in flight, with its nesting and relationships.
 *
 * WHAT THE DATA SAYS (2026-08-25, 61 items):
 *  - 3 Product Families exist but are near-empty: Transform the core (1 child),
 *    Agent use cases (1), AI strategy (0). The intended top layer is a stub.
 *  - 18 Features sit with NO parent — the real work, unattached to any family.
 *  - Those Features self-organise by TITLE PREFIX: SALES 5, INF 4, CAP 3,
 *    CLIENT 1, unprefixed 5. That naming convention IS the de-facto structure.
 *  So the cockpit groups by prefix (what people actually do) while showing the
 *  Product Family layer honestly as the stub it is.
 *
 * v2 (2026-08-25): FOLLOW PARENTS OUTWARD. The NEST area path is a LENS, not a
 * container. 12 of its Features have parents living in other area paths —
 * Statement of Work items in Client deliverables, Products in GTM and
 * capability build. v1 queried only within the NEST, so those Features looked
 * like orphans when they were simply children of items it never fetched.
 *
 * Hierarchy as it actually runs:
 *   Product Family -> Product -> Feature -> PBI -> Task
 * with Statement of Work sitting alongside Product as a client-facing parent.
 *
 * READ-ONLY. No write path to Azure DevOps exists in this file.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";

const VAULT = `${homedir()}/obsidian`;
const OUT = `${VAULT}/02 Doing/Cockpit/Digital NEST.md`;
const AREA = "ADD - The Digital NEST";
const API = "api-version=7.1";

/** Title-prefix → the stream it really belongs to. Derived from the data. */
const STREAMS: Record<string, string> = {
  SALES: "Sales pipeline", INF: "Inform internal", CAP: "Capability build",
  CLIENT: "Client delivery",
};
const UNPREFIXED = "Unclassified";

function env(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const l of readFileSync(`${homedir()}/.claude/.env`, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return o;
}
const E = env(), ORG = E.ADO_ORG, PROJ = E.ADO_PROJECT, P = encodeURIComponent(E.ADO_PROJECT);
if (!ORG || !E.ADO_PAT) { console.error("run SetAdoCreds.sh"); process.exit(1); }
const H = { Authorization: "Basic " + Buffer.from(":" + E.ADO_PAT).toString("base64"), "Content-Type": "application/json" };

async function wiql(q: string): Promise<number[]> {
  const r = await fetch(`https://dev.azure.com/${ORG}/${P}/_apis/wit/wiql?${API}`,
    { method: "POST", headers: H, body: JSON.stringify({ query: q }), signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error(`WIQL ${r.status}`);
  return ((await r.json()).workItems ?? []).map((w: any) => w.id);
}
async function items(ids: number[]): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const r = await fetch(`https://dev.azure.com/${ORG}/_apis/wit/workitems?ids=${ids.slice(i, i + 200).join(",")}` +
      `&fields=System.Title,System.WorkItemType,System.State,System.Parent,System.AssignedTo,System.ChangedDate,System.Tags,System.AreaPath&${API}`,
      { headers: H, signal: AbortSignal.timeout(40000) });
    if (!r.ok) throw new Error(`items ${r.status}`);
    out.push(...((await r.json()).value ?? []));
  }
  return out;
}

const DONE = new Set(["Done", "Closed", "Removed", "Completed"]);
const esc = (s: string) => (s ?? "").replace(/\|/g, "\\|").trim();
const days = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 864e5);

function streamOf(title: string): string {
  const m = title.match(/^\s*([A-Za-z]+)\s*-/);
  const key = m ? m[1].toUpperCase() : "";
  return STREAMS[key] ?? UNPREFIXED;
}

async function main() {
  const ids = await wiql(
    `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject]=@project ` +
    `AND [System.AreaPath] UNDER 'Digital solutions team\\${AREA}' ORDER BY [System.ChangedDate] DESC`);
  const all = await items(ids);
  const byId = new Map(all.map(w => [w.id, w]));
  const kids = new Map<number, any[]>();
  for (const w of all) {
    const p = w.fields["System.Parent"];
    if (p && byId.has(p)) (kids.get(p) ?? kids.set(p, []).get(p)!).push(w);
  }

  // Walk every NEST item's ancestry OUTWARD, fetching parents that live in
  // other area paths until we hit a root. This is the fix for v1's "orphans".
  const ext = new Map<number, any>();
  let frontier = all.map(w => w.fields["System.Parent"]).filter(Boolean) as number[];
  for (let hop = 0; hop < 6 && frontier.length; hop++) {
    const need = [...new Set(frontier)].filter(id => !byId.has(id) && !ext.has(id));
    if (!need.length) break;
    for (const w of await items(need)) ext.set(w.id, w);
    frontier = need.map(id => ext.get(id)?.fields?.["System.Parent"]).filter(Boolean) as number[];
  }
  const node = (id: number) => byId.get(id) ?? ext.get(id);

  /** Full ancestry, nearest parent first. */
  const lineage = (w: any): any[] => {
    const out: any[] = []; let cur = w, hop = 0;
    while (hop++ < 6) {
      const p = cur.fields["System.Parent"]; if (!p) break;
      const n = node(p); if (!n) break;
      out.push(n); cur = n;
    }
    return out;
  };

  const families = all.filter(w => w.fields["System.WorkItemType"] === "Product Family");
  // A "root" here = a NEST item whose parent is absent entirely (a true orphan).
  const roots = all.filter(w => !w.fields["System.Parent"] && w.fields["System.WorkItemType"] !== "Product Family");
  const adopted = all.filter(w => w.fields["System.Parent"] && !byId.has(w.fields["System.Parent"]));

  /** Everything beneath an item, to any depth, within the fetched set. */
  const descend = (w: any, acc: any[] = []): any[] => {
    for (const c of kids.get(w.id) ?? []) { acc.push(c); descend(c, acc); }
    return acc;
  };

  // Prefix grouping — the de-facto structure people actually use.
  const groups = new Map<string, any[]>();
  for (const w of [...roots, ...adopted]) {
    const s = streamOf(w.fields["System.Title"]);
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s)!.push(w);
  }

  const now = new Date().toISOString();
  const L: string[] = [
    "---", "title: Digital NEST — Cockpit", "type: cockpit", `date: ${now.slice(0, 10)}`,
    `generated: ${now}`, "source: azure-devops", "tags: [cockpit, devops, nest]", "---", "",
    "> [!warning] Generated — do not edit",
    "> `LIFEOS/TOOLS/NestCockpit.ts`, hourly. Read-only; nothing written back to ADO.", "",
    "# Digital NEST", "",
    `**${AREA}** · ${all.length} items · refreshed ${now.slice(0, 16).replace("T", " ")}`, "",
  ];

  // Where NEST work actually lives in the wider hierarchy.
  L.push("## Where this work really sits", "",
    `The NEST is an **area path**, not a container. **${adopted.length} of ${all.length}** items have`,
    "parents in other area paths, so their real home is elsewhere in the hierarchy.", "",
    "| NEST item | Its parent | Parent type | Parent lives in |", "|---|---|---|---|");
  for (const w of adopted) {
    const p = node(w.fields["System.Parent"]);
    if (!p) continue;
    const pf = p.fields;
    L.push(`| ${esc(w.fields["System.Title"]).slice(0,34)} | [${esc(pf["System.Title"]).slice(0,32)}](https://dev.azure.com/${ORG}/${P}/_workitems/edit/${p.id}) | ${pf["System.WorkItemType"]} | ${((pf["System.AreaPath"] as string) ?? "—").split("\\").slice(1).join(" / ") || "—"} |`);
  }
  L.push("");

  // Mermaid — the type model, then the live shape.
  const typePairs = new Set<string>();
  for (const w of [...all, ...ext.values()]) {
    const p = w.fields["System.Parent"] ? node(w.fields["System.Parent"]) : null;
    if (p) typePairs.add(`${p.fields["System.WorkItemType"]}|${w.fields["System.WorkItemType"]}`);
  }
  const safe = (s: string) => s.replace(/[^A-Za-z]/g, "");
  L.push("## The type model, as the data actually uses it", "", "```mermaid", "graph TD");
  for (const pair of [...typePairs].sort()) {
    const [a, b] = pair.split("|");
    L.push(`  ${safe(a)}["${a}"] --> ${safe(b)}["${b}"]`);
  }
  L.push("```", "",
    "*Generated from every parent/child pair present in this data — not from the",
    "process template. If a link looks wrong, the data has it that way.*", "");

  // Mermaid — the actual Frontier-relevant lineage, capped for readability.
  L.push("## How NEST work hangs off the wider structure", "", "```mermaid", "graph LR");
  const seen = new Set<string>();
  for (const w of adopted.slice(0, 14)) {
    const chain = [w, ...lineage(w)].reverse();
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i], b = chain[i + 1];
      const key = `${a.id}->${b.id}`;
      if (seen.has(key)) continue; seen.add(key);
      const lbl = (x: any) => `${x.id}["${(x.fields["System.Title"] ?? "").replace(/"/g, "").slice(0, 26)}<br/><small>${x.fields["System.WorkItemType"]}</small>"]`;
      L.push(`  ${lbl(a)} --> ${lbl(b)}`);
    }
  }
  L.push("```", "");

  // The real map, grouped by prefix stream.
  L.push("## The work, as it actually nests", "");
  const order = ["Sales pipeline", "Client delivery", "Capability build", "Inform internal", UNPREFIXED];
  for (const g of order) {
    const ws = groups.get(g); if (!ws?.length) continue;
    const open = ws.filter(w => !DONE.has(w.fields["System.State"]));
    L.push(`### ${g}  ·  ${open.length} open of ${ws.length}`, "");
    for (const w of ws.sort((a, b) => a.fields["System.Title"].localeCompare(b.fields["System.Title"]))) {
      const f = w.fields, who = (f["System.AssignedTo"] ?? {})?.displayName ?? "_unassigned_";
      const sub = descend(w);
      const done = sub.filter(c => DONE.has(c.fields["System.State"])).length;
      const age = days(f["System.ChangedDate"]);
      const flag = age > 60 ? ` ⚠️ ${age}d` : "";
      L.push(`- **[${esc(f["System.Title"])}](https://dev.azure.com/${ORG}/${P}/_workitems/edit/${w.id})** — ${f["System.State"]} · ${who}${flag}`);
      for (const c of sub) {
        const cf = c.fields, indent = "  ";
        L.push(`${indent}- ${cf["System.WorkItemType"]}: [${esc(cf["System.Title"])}](https://dev.azure.com/${ORG}/${P}/_workitems/edit/${c.id}) — ${cf["System.State"]}`);
      }
      if (sub.length) L.push(`  - *${done}/${sub.length} beneath complete*`);
    }
    L.push("");
  }

  // What needs a decision.
  const noOwner = roots.filter(w => !(w.fields["System.AssignedTo"] ?? {})?.displayName);
  const stale = roots.filter(w => days(w.fields["System.ChangedDate"]) > 60);
  const childless = roots.filter(w => !(kids.get(w.id) ?? []).length);
  L.push("## Needs a decision", "",
    `- **${noOwner.length} of ${roots.length} have no owner** — ${noOwner.slice(0,4).map(w=>esc(w.fields["System.Title"])).join(", ")}${noOwner.length>4?"…":""}`,
    `- **${stale.length} untouched over 60 days**`,
    `- **${childless.length} have nothing beneath them** — a Feature with no PBIs is a title, not a plan`,
    `- **${roots.length} are genuinely parentless** — no parent link at all, in or out of the NEST`,
    `- **${adopted.length} are parented outside the NEST** — normal, but it means the NEST board never shows their context`, "");

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, L.join("\n"), "utf8");
  console.log(`wrote ${OUT}`);
  console.log(`  ${all.length} items · ${families.length} families · ${roots.length} unparented roots · ${groups.size} streams`);
}
main().catch(e => { console.error("NestCockpit failed:", e.message); process.exit(1); });
