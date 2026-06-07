#!/usr/bin/env bun
// PAI Obsidian Capture Server v2
// Unified capture webhook replacing ObsidianVoiceWebhook.ts
// Endpoints: POST /voice-note (iOS compat), POST /capture (text), POST /youtube, GET / (web UI)
// Port: 27337 — same as predecessor, drop-in replacement

import { join } from 'path'
import { mkdir, unlink } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import { spawnSync, spawn } from 'child_process'

const PORT = parseInt(process.env.VOICE_WEBHOOK_PORT || '27337')
const VAULT = '/opt/docker/appdata/obsidian-jellybase/vault/OB_v2'
const INBOX = join(VAULT, '00 INBOX')
const YOUTUBE_VAULT = join(VAULT, '04 VAULT/YouTube')
const SECRET = process.env.VOICE_WEBHOOK_SECRET || ''
const YTDLP = process.env.YTDLP_PATH || '/home/jellypai/.local/bin/yt-dlp'
const YOUTUBE_TIMEOUT_MS = 45_000
const AI_TIMEOUT_MS = 75_000

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 16)
}

function slugDate(): string {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
}

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com' ||
      u.hostname === 'youtu.be' || u.hostname === 'm.youtube.com'
  } catch {
    return false
  }
}

// ── VTT parsing ──────────────────────────────────────────────────────────────

interface VttSegment { seconds: number; text: string }

function parseVttSegments(content: string): VttSegment[] {
  const lines = content.split('\n')
  const segments: VttSegment[] = []
  let currentSeconds = 0
  let prev = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === 'WEBVTT') continue
    if (/^(Kind|Language|NOTE|STYLE)[\s:]/.test(trimmed)) continue

    const tsMatch = trimmed.match(/^(\d{2}):(\d{2}):(\d{2})\.\d+ -->/)
    if (tsMatch) {
      currentSeconds = parseInt(tsMatch[1]) * 3600 + parseInt(tsMatch[2]) * 60 + parseInt(tsMatch[3])
      continue
    }

    const clean = trimmed.replace(/<[^>]+>/g, '').trim()
    if (!clean || clean === prev) continue
    segments.push({ seconds: currentSeconds, text: clean })
    prev = clean
  }
  return segments
}

function vttToPlainText(segments: VttSegment[]): string {
  return segments.map(s => s.text).join(' ').trim().slice(0, 4000)
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// Thins out segment density for the AI prompt (~every 3rd line with timestamps)
function vttForAI(segments: VttSegment[]): string {
  return segments
    .filter((_, i) => i % 3 === 0)
    .map(s => `[${formatSeconds(s.seconds)}/${s.seconds}s] ${s.text}`)
    .join('\n')
    .slice(0, 6000)
}

// ── Process helpers ───────────────────────────────────────────────────────────

function runProcess(cmd: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    const proc = spawn(cmd, args, { env: { ...process.env, PATH: `/home/jellypai/.local/bin:${process.env.PATH}` } })
    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })
    const timer = setTimeout(() => { proc.kill(); resolve({ stdout, stderr, code: -1 }) }, timeoutMs)
    proc.on('close', (code: number | null) => { clearTimeout(timer); resolve({ stdout, stderr, code: code ?? 0 }) })
  })
}

const OPENCODE = '/home/jellypai/.bun/bin/opencode'
const OPENCODE_SERVER = 'http://localhost:7878'

function getOpenCodePassword(): string {
  // Read OPENCODE_SERVER_PASSWORD from the opencode serve process environment.
  // The password is auto-generated at server start and stored in its proc env.
  try {
    const pg = spawnSync('pgrep', ['-f', 'opencode serve'], { encoding: 'utf8' })
    const pid = pg.stdout.trim().split('\n')[0]
    if (!pid) return process.env.OPENCODE_SERVER_PASSWORD || ''
    const envRaw = readFileSync(`/proc/${pid}/environ`, 'utf8')
    const match = envRaw.split('\0').find(e => e.startsWith('OPENCODE_SERVER_PASSWORD='))
    return match ? match.slice('OPENCODE_SERVER_PASSWORD='.length) : (process.env.OPENCODE_SERVER_PASSWORD || '')
  } catch {
    return process.env.OPENCODE_SERVER_PASSWORD || ''
  }
}

async function runOpenCode(prompt: string): Promise<string> {
  // opencode run requires --attach + OPENCODE_SERVER_PASSWORD when spawned without a TTY;
  // the header line ("> build · model") goes to stderr, stdout is clean response text
  return new Promise((resolve) => {
    let stdout = ''
    const proc = spawn(
      OPENCODE,
      ['run', '--attach', OPENCODE_SERVER, '-m', 'openai/gpt-5.5', prompt],
      {
        env: {
          HOME: '/home/jellypai',
          PATH: `/home/jellypai/.local/bin:/home/jellypai/.bun/bin:/usr/local/bin:/usr/bin:/bin`,
          OPENCODE_SERVER_PASSWORD: getOpenCodePassword(),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
    const timer = setTimeout(() => { proc.kill(); resolve('') }, AI_TIMEOUT_MS)
    proc.on('close', () => { clearTimeout(timer); resolve(stdout.trim()) })
  })
}

// ── YouTube extraction ────────────────────────────────────────────────────────

interface YouTubeMeta {
  title: string
  description: string
  channel: string
  durationString: string
  uploadDate: string
  thumbnail: string
  categories: string[]
  videoId: string
  segments: VttSegment[]
  transcriptOk: boolean
}

function metaIsUsable(meta: YouTubeMeta): boolean {
  if (!meta.title.trim()) return false
  return meta.segments.length > 5 || meta.description.trim().length > 50
}

async function extractYouTube(url: string): Promise<YouTubeMeta> {
  const empty: YouTubeMeta = {
    title: '', description: '', channel: '', durationString: '', uploadDate: isoDate(),
    thumbnail: '', categories: [], videoId: '', segments: [], transcriptOk: false,
  }

  const metaResult = await runProcess(YTDLP, ['--dump-json', '--no-download', url], YOUTUBE_TIMEOUT_MS)
  if (metaResult.code !== 0 || !metaResult.stdout.trim()) return empty

  let raw: any = {}
  try { raw = JSON.parse(metaResult.stdout) } catch { return empty }

  const uploadDate = raw.upload_date
    ? `${raw.upload_date.slice(0, 4)}-${raw.upload_date.slice(4, 6)}-${raw.upload_date.slice(6, 8)}`
    : isoDate()

  const thumbnail = (() => {
    if (Array.isArray(raw.thumbnails) && raw.thumbnails.length > 0) {
      // Prefer highest resolution
      return raw.thumbnails[raw.thumbnails.length - 1]?.url || raw.thumbnail || ''
    }
    return raw.thumbnail || ''
  })()

  const meta: YouTubeMeta = {
    title: raw.title || '',
    description: (raw.description || '').slice(0, 2000),
    channel: raw.channel || raw.uploader || '',
    durationString: raw.duration_string || '',
    uploadDate,
    thumbnail,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    videoId: raw.id || '',
    segments: [],
    transcriptOk: false,
  }

  // Extract subtitles
  const tmpBase = `/tmp/yt-${Date.now()}`
  const subResult = await runProcess(
    YTDLP,
    ['--write-auto-sub', '--skip-download', '--sub-format', 'vtt',
      '--sub-lang', 'en', '--output', `${tmpBase}.%(ext)s`, url],
    YOUTUBE_TIMEOUT_MS
  )

  if (subResult.code === 0) {
    for (const candidate of [`${tmpBase}.en.vtt`, `${tmpBase}.en-orig.vtt`]) {
      if (existsSync(candidate)) {
        const vttRaw = await Bun.file(candidate).text()
        unlink(candidate).catch(() => {})
        meta.segments = parseVttSegments(vttRaw)
        meta.transcriptOk = meta.segments.length > 0
        break
      }
    }
  }

  return meta
}

// ── AI analysis ───────────────────────────────────────────────────────────────

async function analyzeYouTube(meta: YouTubeMeta, url: string): Promise<string> {
  const transcriptBlock = meta.transcriptOk
    ? vttForAI(meta.segments)
    : `(No captions available)\n\nDescription:\n${meta.description.slice(0, 1000)}`

  const system = 'You are a precise video analyst. Generate clean Markdown analysis in the exact sections requested. No preamble, no explanation outside the sections, no meta-commentary.'

  const user = `YouTube video:
Title: ${meta.title}
Channel: ${meta.channel}
Published: ${meta.uploadDate}
${meta.description ? `Description: ${meta.description.slice(0, 400)}\n` : ''}
Transcript (format [MM:SS/total_seconds] text):
${transcriptBlock}

Generate these sections in exact order with these exact headings:

## Summary
2-4 sentences summarising the video.

## Key Takeaways
3-7 bullet points of the most important takeaways.

## Mindmap
\`\`\`mermaid
mindmap
  root((${meta.title.slice(0, 45).replace(/"/g, "'")}))
\`\`\`
Complete the mindmap above with main topics and subtopics. Plain text only, no icons.

## Notable Quotes
3-5 notable quotes with timestamp links. Use the total_seconds value from the transcript format:
- [MM:SS: quote text](https://www.youtube.com/watch?v=${meta.videoId}&t=SECONDSs)

## Best Ideas
The best actionable ideas from the video.

## Tools
Any tools, frameworks, or resources mentioned that could be applied in real life. Skip if none.

## Reflection
Key learning points in 2-4 bullets.

## Key Message
One sentence: the single key message of this video.`

  const analysis = await runOpenCode(`${system}\n\n${user}`)
  if (!analysis) return fallbackAnalysis(meta)
  return analysis
}

function fallbackAnalysis(meta: YouTubeMeta): string {
  const plain = vttToPlainText(meta.segments)
  return `## Summary

${meta.description ? meta.description.slice(0, 500) : '*(AI analysis unavailable — call timed out or failed.)*'}

## Transcript

${plain || '*(No transcript extracted.)*'}`
}

// ── Note builders ─────────────────────────────────────────────────────────────

function buildVoiceNote(transcription: string, title?: string): string {
  const noteTitle = title || `Voice ${timestamp()}`
  return `---
title: "${noteTitle}"
type: capture
date: ${isoDate()}
tags: [inbox, voice]
source: voice
---

${transcription.trim()}
`
}

function buildCaptureNote(text: string, title?: string, source = 'text'): string {
  const noteTitle = title || `Capture ${timestamp()}`
  return `---
title: "${noteTitle}"
type: capture
date: ${isoDate()}
tags: [inbox]
source: ${source}
---

${text.trim()}
`
}

function buildYouTubeNote(url: string, meta: YouTubeMeta, analysis: string, noteTitle?: string): string {
  const title = (noteTitle || meta.title || `YouTube ${timestamp()}`).replace(/"/g, '\\"')
  const description = meta.description.slice(0, 300).replace(/"/g, '\\"').replace(/\n/g, ' ')
  const channel = meta.channel.replace(/"/g, '\\"')
  const tags = meta.categories.length > 0
    ? `[youtube, ${meta.categories.slice(0, 3).map(c => c.toLowerCase().replace(/[^a-z0-9-]/g, '-')).join(', ')}]`
    : '[youtube]'
  const genre = meta.categories.map(c => `"${c.replace(/"/g, '\\"')}"`).join(', ')

  const plain = vttToPlainText(meta.segments)
  const transcriptCallout = plain
    ? `\n> [!transcript]- Transcript\n> ${plain.replace(/\n/g, '\n> ')}`
    : ''

  return `---
title: "${title}"
type: capture
date: ${isoDate()}
tags: ${tags}
source: youtube
url: "${url}"
channel: "${channel}"
description: "${description}"
duration: "${meta.durationString}"
published: ${meta.uploadDate}
thumbnailUrl: "${meta.thumbnail}"
genre: [${genre}]
watched:
---

![${meta.title}](${url})

${analysis}
${transcriptCallout}
`
}

// ── Simple fallback for when meta is unusable ─────────────────────────────────

function buildSimpleYouTubeNote(url: string, title?: string): string {
  const noteTitle = title || `YouTube ${timestamp()}`
  return `---
title: "${noteTitle}"
type: capture
date: ${isoDate()}
tags: [inbox, youtube]
source: youtube
url: "${url}"
---

${url}

*(Metadata unavailable — video may be private, age-restricted, or yt-dlp failed.)*
`
}

// ── Auth / logging ────────────────────────────────────────────────────────────

function checkAuth(req: Request): boolean {
  if (!SECRET) return true
  return req.headers.get('x-pai-secret') === SECRET
}

function logReq(method: string, path: string, status: number, file?: string): void {
  console.log(`[${timestamp()}] ${method} ${path} → ${status}${file ? ` (${file})` : ''}`)
}

// ── Web UI ────────────────────────────────────────────────────────────────────

const WEB_UI = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PAI Capture</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #1a1a2e; color: #e0e0e0; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: #16213e; border-radius: 12px; padding: 1.5rem;
            width: 100%; max-width: 520px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
    h1 { font-size: 1.25rem; margin-bottom: 1.25rem; color: #7c9cbf; }
    label { display: block; font-size: 0.8rem; color: #9ab; margin-bottom: 0.3rem; margin-top: 1rem; }
    input, textarea { width: 100%; padding: 0.75rem; border-radius: 8px;
                      border: 1px solid #2d4a6e; background: #0f3460; color: #e0e0e0;
                      font-size: 1rem; outline: none; }
    input:focus, textarea:focus { border-color: #5e9bdb; }
    textarea { min-height: 130px; resize: vertical; }
    button { margin-top: 1.25rem; width: 100%; padding: 0.85rem;
             background: #5e9bdb; color: #fff; font-size: 1rem; font-weight: 600;
             border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #7ab3e8; }
    button:disabled { background: #3a5a7a; cursor: not-allowed; }
    #status { margin-top: 1rem; padding: 0.75rem; border-radius: 8px;
              font-size: 0.9rem; display: none; }
    #status.ok { background: #1e4d2b; color: #7dda95; display: block; }
    #status.err { background: #4d1e1e; color: #da7d7d; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📥 PAI Capture</h1>
    <form id="form" method="POST" action="/capture">
      <label for="text">Capture a thought</label>
      <textarea id="text" name="text" placeholder="What's on your mind?" autocomplete="off"></textarea>
      <label for="yt">YouTube URL (optional)</label>
      <input id="yt" name="youtube_url" type="url" placeholder="https://youtube.com/watch?v=..." autocomplete="off">
      <label for="ttl">Title (optional)</label>
      <input id="ttl" name="title" type="text" placeholder="Leave blank for auto-title" autocomplete="off">
      <button type="submit" id="btn">Send to Obsidian</button>
    </form>
    <div id="status"></div>
  </div>
  <script>
    const form = document.getElementById('form');
    const btn = document.getElementById('btn');
    const status = document.getElementById('status');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.className = '';
      status.style.display = 'none';
      const yt = document.getElementById('yt').value.trim();
      const text = document.getElementById('text').value.trim();
      const title = document.getElementById('ttl').value.trim();
      let endpoint, body;
      if (yt) {
        endpoint = '/youtube';
        body = JSON.stringify({ url: yt, title: title || undefined });
      } else if (text) {
        endpoint = '/capture';
        body = JSON.stringify({ text, title: title || undefined });
      } else {
        status.textContent = 'Please enter a thought or YouTube URL.';
        status.className = 'err';
        btn.disabled = false; btn.textContent = 'Send to Obsidian';
        return;
      }
      try {
        const res = await fetch(endpoint, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          status.textContent = '✓ Saved to Obsidian' + (json.file ? ': ' + json.file : '');
          status.className = 'ok';
          form.reset();
        } else {
          status.textContent = 'Error: ' + (json.error || res.statusText);
          status.className = 'err';
        }
      } catch (err) {
        status.textContent = 'Network error — is PAI running?';
        status.className = 'err';
      }
      btn.disabled = false;
      btn.textContent = 'Send to Obsidian';
    });
  </script>
</body>
</html>`

// ── Server ────────────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req: Request) {
    const url = new URL(req.url)
    const method = req.method

    if (url.pathname === '/' && method === 'GET') {
      logReq(method, '/', 200)
      return new Response(WEB_UI, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    if (url.pathname === '/capture' && method === 'POST') {
      const contentType = req.headers.get('content-type') || ''
      if (!checkAuth(req)) {
        logReq(method, url.pathname, 403)
        return new Response('Forbidden', { status: 403 })
      }

      let text = '', title = '', source = 'text'

      if (contentType.includes('application/json')) {
        let body: { text?: string; title?: string; source?: string }
        try { body = await req.json() } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        text = body.text?.trim() || ''
        title = body.title?.trim() || ''
        source = body.source?.trim() || 'text'
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const fd = await req.formData()
        text = (fd.get('text') as string || '').trim()
        title = (fd.get('title') as string || '').trim()
      }

      if (!text) {
        logReq(method, url.pathname, 400)
        if (contentType.includes('application/x-www-form-urlencoded')) {
          return new Response('Missing text', { status: 400 })
        }
        return Response.json({ error: 'Missing text' }, { status: 400 })
      }

      const filename = `Capture ${slugDate()}.md`
      const filePath = join(INBOX, filename)
      await mkdir(INBOX, { recursive: true })
      await Bun.write(filePath, buildCaptureNote(text, title, source))
      logReq(method, url.pathname, 200, filename)

      if (contentType.includes('application/x-www-form-urlencoded')) {
        return new Response(
          `<html><body style="font-family:sans-serif;padding:2rem">✓ Saved: ${filename} <a href="/">← Back</a></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        )
      }
      return Response.json({ ok: true, file: filename })
    }

    if (url.pathname === '/voice-note' && method === 'POST') {
      if (!checkAuth(req)) {
        logReq(method, url.pathname, 403)
        return new Response('Forbidden', { status: 403 })
      }
      let body: { transcription?: string; title?: string }
      try { body = await req.json() } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 })
      }
      const transcription = body.transcription?.trim() || ''
      if (!transcription) {
        logReq(method, url.pathname, 400)
        return Response.json({ error: 'Missing transcription' }, { status: 400 })
      }
      const filename = `Voice ${slugDate()}.md`
      const filePath = join(INBOX, filename)
      await mkdir(INBOX, { recursive: true })
      await Bun.write(filePath, buildVoiceNote(transcription, body.title))
      logReq(method, url.pathname, 200, filename)
      return Response.json({ ok: true, file: filename })
    }

    if (url.pathname === '/youtube' && method === 'POST') {
      if (!checkAuth(req)) {
        logReq(method, url.pathname, 403)
        return new Response('Forbidden', { status: 403 })
      }
      let body: { url?: string; title?: string }
      try { body = await req.json() } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 })
      }
      const ytUrl = body.url?.trim() || ''
      if (!ytUrl || !isYouTubeUrl(ytUrl)) {
        logReq(method, url.pathname, 400)
        return Response.json({ error: 'Missing or invalid YouTube URL' }, { status: 400 })
      }

      const meta = await extractYouTube(ytUrl)

      // If meta is unusable, drop a simple note to INBOX instead
      if (!metaIsUsable(meta)) {
        const filename = `YouTube ${slugDate()}.md`
        await mkdir(INBOX, { recursive: true })
        await Bun.write(join(INBOX, filename), buildSimpleYouTubeNote(ytUrl, body.title))
        logReq(method, url.pathname, 200, `INBOX/${filename}`)
        return Response.json({ ok: true, file: filename, analyzed: false, transcript_ok: false })
      }

      // Generate AI analysis
      const analysis = await analyzeYouTube(meta, ytUrl)

      // Write to 04 VAULT/YouTube
      const safeTitle = (body.title || meta.title || 'YouTube').replace(/[/\\:*?"<>|]/g, '-').slice(0, 100)
      const filename = `${safeTitle}.md`
      await mkdir(YOUTUBE_VAULT, { recursive: true })
      await Bun.write(join(YOUTUBE_VAULT, filename), buildYouTubeNote(ytUrl, meta, analysis, body.title))
      logReq(method, url.pathname, 200, `YouTube/${filename}`)
      return Response.json({ ok: true, file: filename, analyzed: true, transcript_ok: meta.transcriptOk })
    }

    logReq(method, url.pathname, 404)
    return new Response('Not found', { status: 404 })
  },
})

console.log(`PAI Capture Server v2 on :${PORT}`)
console.log(`  POST /voice-note  — voice (iOS Shortcut compat)`)
console.log(`  POST /capture     — text capture`)
console.log(`  POST /youtube     — YouTube extraction + AI analysis → 04 VAULT/YouTube`)
console.log(`  GET  /            — web capture UI`)
if (SECRET) console.log('  Auth: x-pai-secret header required')
