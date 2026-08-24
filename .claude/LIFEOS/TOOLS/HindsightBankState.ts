#!/usr/bin/env bun
/**
 * HindsightBankState.ts — cache the coding-agent bank's state for the 🧠 line.
 *
 * Hindsight retains automatically and invisibly; MemoryDeltaSurface renders the
 * 🧠 MEMORY line but must never make a network call on the prompt path. So this
 * runs off the Stop chain, writes a small JSON cache, and the surface reads it.
 *
 * Fail-open everywhere: server down, config absent, bank unmapped ⇒ exit quiet,
 * leaving any previous cache to age out. A memory indicator must never be able
 * to break a turn.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

const CFG = resolve(homedir(), ".hindsight/coding-agent.json");
const OUT = resolve(homedir(), ".claude/LIFEOS/MEMORY/STATE/hindsight-bank.json");
const TIMEOUT_MS = 4000;

function resolveBank(cfg: any, cwd: string): string | null {
  const map = cfg?.mapPathToBank;
  if (map && typeof map === "object") {
    // longest prefix wins, matching the integration's own rule
    const hit = Object.keys(map)
      .filter((p) => cwd === p || cwd.startsWith(p.endsWith("/") ? p : p + "/"))
      .sort((a, b) => b.length - a.length)[0];
    if (hit) return String(map[hit]);
  }
  if (cfg?.bankId) return String(cfg.bankId);
  return null;
}

async function main() {
  if (!existsSync(CFG)) return;
  const cfg = JSON.parse(readFileSync(CFG, "utf8"));
  const bank = resolveBank(cfg, process.cwd());
  if (!bank) return;

  const base = String(cfg.apiUrl || "").replace(/\/+$/, "");
  if (!base) return;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  const res = await fetch(`${base}/v1/default/banks`, { signal: ctl.signal });
  clearTimeout(timer);
  if (!res.ok) return;

  const data = (await res.json()) as { banks?: Array<Record<string, unknown>> };
  const row = (data.banks ?? []).find((b) => b.bank_id === bank);
  if (!row) return;

  const facts = Number(row.fact_count ?? 0);
  let wrote = 0;
  try {
    if (existsSync(OUT)) {
      const prev = JSON.parse(readFileSync(OUT, "utf8"));
      if (Number.isFinite(prev?.facts)) wrote = Math.max(0, facts - Number(prev.facts));
    }
  } catch { /* first run */ }

  mkdirSync(resolve(OUT, ".."), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ bank, facts, wrote, ts: new Date().toISOString() }, null, 2));
}

main().catch(() => { /* fail-open: never break the Stop chain */ });
