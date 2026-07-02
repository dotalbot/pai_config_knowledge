#!/usr/bin/env bun

/**
 * GetTranscript.ts - Extract transcript from YouTube video
 *
 * Usage:
 *   bun ~/.claude/PAI/TOOLS/GetTranscript.ts <youtube-url>
 *   bun ~/.claude/PAI/TOOLS/GetTranscript.ts <youtube-url> --save <output-file>
 *
 * Examples:
 *   bun ~/.claude/PAI/TOOLS/GetTranscript.ts "https://www.youtube.com/watch?v=abc123"
 *   bun ~/.claude/PAI/TOOLS/GetTranscript.ts "https://youtu.be/abc123" --save transcript.txt
 *
 * @author PAI System
 * @version 2.0.0
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const HELP = `
GetTranscript - Extract transcript from YouTube video using yt-dlp captions

Usage:
  bun GetTranscript.ts <youtube-url> [options]

Options:
  --save <file>    Save transcript to file
  --lang <code>    Subtitle language (default: en)
  --help           Show this help message

Examples:
  bun GetTranscript.ts "https://www.youtube.com/watch?v=abc123"
  bun GetTranscript.ts "https://youtu.be/xyz789" --save ~/transcript.txt

Supported URL formats:
  - https://www.youtube.com/watch?v=VIDEO_ID
  - https://youtu.be/VIDEO_ID
  - https://www.youtube.com/watch?v=VIDEO_ID&t=123
  - https://youtube.com/shorts/VIDEO_ID
`;

// yt-dlp is resolved from either the project venv or the system PATH — no
// other external binary (e.g. fabric) is required.
const YT_DLP_CANDIDATES = [
  join(process.env.HOME || '', '.venv', 'pai-tools', 'bin', 'yt-dlp'),
  join(process.env.HOME || '', '.local', 'bin', 'yt-dlp'),
  'yt-dlp',
];

function resolveYtDlp(): string {
  for (const candidate of YT_DLP_CANDIDATES) {
    try {
      execSync(`${candidate.includes('/') ? candidate : `command -v ${candidate}`} --version`, {
        stdio: 'pipe',
      });
      return candidate;
    } catch {
      /* try next candidate */
    }
  }
  console.error('❌ Error: yt-dlp not found (checked venv, ~/.local/bin, and PATH)');
  process.exit(1);
}

/**
 * Strip WebVTT markup (timestamps, cue settings, tag markup) down to plain
 * spoken text, collapsing consecutive duplicate lines that auto-captions
 * commonly repeat across overlapping cues.
 */
function vttToPlainText(vtt: string): string {
  const lines = vtt.split('\n');
  const out: string[] = [];
  let lastLine = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === 'WEBVTT') continue;
    if (/^\d+$/.test(line)) continue; // cue index
    if (/-->/.test(line)) continue; // timestamp line
    if (/^(Kind|Language):/i.test(line)) continue;

    const plain = line.replace(/<[^>]+>/g, '').trim();
    if (!plain || plain === lastLine) continue;

    out.push(plain);
    lastLine = plain;
  }

  return out.join('\n');
}

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(HELP);
  process.exit(0);
}

// Find URL (first arg that looks like a URL)
const url = args.find(arg => arg.includes('youtube.com') || arg.includes('youtu.be'));

if (!url) {
  console.error('❌ Error: No YouTube URL provided');
  console.log('\nUsage: bun GetTranscript.ts <youtube-url>');
  process.exit(1);
}

// Check for --save option
const saveIndex = args.indexOf('--save');
const outputFile = saveIndex !== -1 ? args[saveIndex + 1] : null;

// Check for --lang option
const langIndex = args.indexOf('--lang');
const lang = langIndex !== -1 ? args[langIndex + 1] : 'en';

console.log(`📺 Extracting transcript from: ${url}`);

const ytDlp = resolveYtDlp();
const workDir = mkdtempSync(join(tmpdir(), 'gettranscript-'));

try {
  execSync(
    `${ytDlp} --write-auto-sub --write-sub --skip-download --sub-format vtt --sub-lang "${lang}" --no-update -o "%(id)s.%(ext)s" "${url}"`,
    {
      cwd: workDir,
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  // yt-dlp names the file <id>.<lang>.vtt; find whatever it actually wrote.
  const written = execSync(`ls *.vtt 2>/dev/null || true`, { cwd: workDir, encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(Boolean);

  if (written.length === 0) {
    console.error('⚠️ No transcript available for this video (no captions in the requested language)');
    process.exit(1);
  }

  const vttPath = join(workDir, written[0]);
  const vtt = readFileSync(vttPath, 'utf-8');
  const transcript = vttToPlainText(vtt);

  if (!transcript.trim()) {
    console.error('⚠️ No transcript available for this video');
    process.exit(1);
  }

  console.log(`✅ Transcript extracted: ${transcript.length} characters\n`);

  if (outputFile) {
    writeFileSync(outputFile, transcript, 'utf-8');
    console.log(`💾 Saved to: ${outputFile}`);
  } else {
    console.log('--- TRANSCRIPT START ---\n');
    console.log(transcript);
    console.log('\n--- TRANSCRIPT END ---');
  }
} catch (error: any) {
  const stderr: string = error.stderr?.toString?.() ?? '';
  if (/no subtitles/i.test(stderr) || /no subtitles/i.test(error.message ?? '')) {
    console.error('⚠️ No transcript available for this video (no captions found)');
  } else if (/Private video|Video unavailable/i.test(stderr)) {
    console.error('❌ Failed to extract transcript: video is private or unavailable');
  } else {
    console.error('❌ Error:', stderr || error.message);
  }
  process.exit(1);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
