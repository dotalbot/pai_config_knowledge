#!/usr/bin/env bun
/**
 * TranscriptRecipe.ts — prepare a meeting transcript for stage 2.
 *
 * Recipes spec §3. Splits the work honestly:
 *
 *   DETERMINISTIC (here): speakers, timing, participation, the diarisation
 *   header, candidate action lines, filename and frontmatter. Facts a regex
 *   can establish and a model would only get wrong.
 *
 *   MODEL (stage 2, from the brief this writes): sectioning the conversation
 *   by argument rather than chronology, the summary, thoughts and feelings,
 *   feeds-the-beast connections. Judgement, not transformation.
 *
 * Target shape: 01 Thinking/Meetings/2026_08_26_Erica_Dom.md, written by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

type Line = { t: string; sec: number; who: string; text: string };

/** Whisper/pyannote format: `[00:12:34] **Name:** text` */
export function parseTranscript(raw: string): { lines: Line[]; header: Record<string, string> } {
  const lines: Line[] = [];
  const header: Record<string, string> = {};
  for (const m of raw.matchAll(/^-?\s*\*?\*?([A-Za-z ]+?)\*?\*?:\s*`?([^`\n]+)`?$/gm)) {
    const k = m[1].trim().toLowerCase();
    if (["meeting id", "processed", "language", "transcription model", "diarization model"].includes(k))
      header[k] = m[2].trim();
  }
  for (const m of raw.matchAll(/^\[(\d\d):(\d\d):(\d\d)\]\s+\*\*(.+?):\*\*\s*(.*)$/gm)) {
    const sec = +m[1] * 3600 + +m[2] * 60 + +m[3];
    lines.push({ t: `${m[1]}:${m[2]}:${m[3]}`, sec, who: m[4].trim(), text: m[5].trim() });
  }
  return { lines, header };
}

/** Phrases that reliably precede a commitment. Candidates for a human to confirm, never auto-actions. */
const ACTION_CUES = /\b(I'?ll |I will |we'?ll |we will |we need to |you need to |let'?s |going to |can you |could you |I'?m going to |we should |need to (get|do|make|send|book|agree|figure)|by (monday|tuesday|wednesday|thursday|friday|next week|the end of))/i;
const DATE_CUES = /\b(monday|tuesday|wednesday|thursday|friday|next week|this week|end of (the )?(week|month|september|october|november)|by \w+day|tomorrow|q[1-4])\b/i;

export function analyse(lines: Line[]) {
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const bySpeaker = new Map<string, { turns: number; words: number }>();
  for (const l of lines) {
    const e = bySpeaker.get(l.who) ?? { turns: 0, words: 0 };
    e.turns++; e.words += words(l.text);
    bySpeaker.set(l.who, e);
  }
  const total = [...bySpeaker.values()].reduce((s, v) => s + v.words, 0);
  const speakers = [...bySpeaker.entries()]
    .map(([who, v]) => ({ who, ...v, share: total ? Math.round((v.words / total) * 100) : 0 }))
    .sort((a, b) => b.words - a.words);

  // Candidate actions: a cue phrase in a substantial line. Deliberately generous —
  // a human confirms, so a false positive costs a glance and a miss costs a commitment.
  const candidates = lines
    .filter(l => words(l.text) >= 6 && ACTION_CUES.test(l.text))
    .map(l => ({ ...l, dated: DATE_CUES.test(l.text) }));

  const duration = lines.length ? lines[lines.length - 1].sec : 0;
  return { speakers, candidates, duration, turns: lines.length };
}

const hhmm = (s: number) => `${Math.floor(s / 60)}m`;

export function buildBrief(job: string, meta: any, raw: string): string {
  const { lines, header } = parseTranscript(raw);
  const a = analyse(lines);
  const date = (meta?.source?.dropped_at ?? new Date().toISOString()).slice(0, 10);
  const named = a.speakers.filter(s => !/unknown/i.test(s.who)).map(s => s.who);
  const fname = `${date.replace(/-/g, "_")}_${named.join("_") || "meeting"}.md`;

  const L = [
    "# Stage 2 brief — transcript", "",
    `**Job** \`${job}\``,
    `**Target** \`01 Thinking/Meetings/${fname}\``,
    `**Template** \`Templates/4 - Meeting Note.md\``, "",
    "## Established deterministically", "",
    `- **Duration** ~${hhmm(a.duration)} · ${a.turns} turns`,
    `- **Date** ${date}`,
    ...(meta?.context ? [`- **Dom's context** — ${meta.context}`] : ["- No context supplied"]),
    ...(header["transcription model"] ? [`- Transcribed \`${header["transcription model"]}\`, diarised \`${header["diarization model"] ?? "?"}\``] : []),
    "",
    "| Speaker | Turns | Words | Share |", "|---|---:|---:|---:|",
    ...a.speakers.map(s => `| ${s.who} | ${s.turns} | ${s.words.toLocaleString()} | ${s.share}% |`),
    "",
    a.speakers.some(s => /unknown/i.test(s.who))
      ? "> ⚠️ Unattributed turns present — diarisation was uncertain. Attribute from context where the meaning depends on who spoke, and say so if you cannot."
      : "",
    "",
    `## Candidate actions (${a.candidates.length}) — confirm, do not assume`, "",
    "*Cue-phrase matches. Some are commitments, some are turns of phrase. The*",
    "*model decides which are real, who owns each, and what the actual wording is.*", "",
    ...a.candidates.slice(0, 30).map(c => `- \`${c.t}\` **${c.who}**${c.dated ? " · ⏱" : ""} — ${c.text.slice(0, 150)}`),
    a.candidates.length > 30 ? `\n*…${a.candidates.length - 30} more in the transcript.*` : "",
    "",
    "## What stage 2 must do", "",
    "1. **Section the Notes by argument, not chronology.** The worked example is",
    "   `01 Thinking/Meetings/2026_08_26_Erica_Dom.md`. Sub-headings should name",
    "   what was being decided, not what came next.",
    "2. **Actions with owners**, from the candidates above plus anything they missed.",
    "3. **Thoughts and feelings** — the unfiltered read, including anything said",
    "   about mood, stress or frustration. This is the part that evaporates.",
    "4. **Feeds the beast** — fill only the channels that genuinely apply.",
    "5. **Related** — link to existing notes and DevOps items where the connection",
    "   is real, not decorative.",
    "6. **Reference the transcript, never paste it.** Source stays source.",
    "",
    "## Constraints", "",
    "- Frontmatter from the template; `status: processed`.",
    "- Quote sparingly and only where the exact words matter.",
    "- If attendees, project or client cannot be established, say so rather than guessing.",
    "",
  ];
  return L.filter(x => x !== "").join("\n");
}

if (import.meta.main) {
  const [jobDir] = process.argv.slice(2);
  if (!jobDir) { console.error("usage: TranscriptRecipe.ts <job-directory>"); process.exit(1); }
  const meta = JSON.parse(readFileSync(`${jobDir}/meta.json`, "utf8"));
  const raw = readFileSync(`${jobDir}/extract.txt`, "utf8");
  const brief = buildBrief(basename(jobDir), meta, raw);
  writeFileSync(`${jobDir}/stage2-brief.md`, brief);
  console.log(`wrote ${jobDir}/stage2-brief.md`);
}
