#!/usr/bin/env bun
// PAI Obsidian Inbox Router
// Routes files from 00 INBOX older than 24h to the right folder.
// Run hourly via cron. State tracked in 07 PAI/.inbox-router-state.json

import { readdir, stat, readFile, rename, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const VAULT = '/opt/docker/appdata/obsidian-jellybase/vault/OB_v2'
const INBOX = join(VAULT, '00 INBOX')
const STATE_FILE = join(VAULT, '07 PAI', '.inbox-router-state.json')
const LOG_FILE = join(VAULT, '07 PAI', 'inbox-router.log')
const MAX_AGE_MS = 2 * 60 * 60 * 1000  // 2h — tighter loop than original 24h

const ROUTES: Record<string, string> = {
  capture: join(VAULT, '05 Journal/Thoughts'),
  voice:   join(VAULT, '05 Journal/Thoughts'),
  journal: join(VAULT, '05 Journal/Thoughts'),
  meeting: join(VAULT, '02 Cards/Meetings'),
  note:    join(VAULT, '02 Cards'),
  idea:    join(VAULT, '02 Cards/Ideas'),
  concept: join(VAULT, '02 Cards/Concepts'),
  quote:   join(VAULT, '02 Cards/Quotes'),
  tool:    join(VAULT, '02 Cards/Tools'),
  work:    join(VAULT, '03 Spaces/Work'),
  web:     join(VAULT, '04 VAULT/Web Clippings'),
  default: join(VAULT, '02 Cards/Ideas'),
}

function classify(filename: string, content: string): string {
  const lower = filename.toLowerCase()

  // 1. Source-based override: youtube source → concept route regardless of type
  const sourceMatch = content.match(/^source:\s*(\S+)/m)
  if (sourceMatch && sourceMatch[1].toLowerCase().replace(/['"]/g, '') === 'youtube') return 'concept'

  // 2. Frontmatter type field (case-insensitive key — handles Type: and type:)
  const typeMatch = content.match(/^[Tt]ype:\s*(\S+)/m)
  if (typeMatch) {
    const t = typeMatch[1].toLowerCase().replace(/['"]/g, '')
    if (t in ROUTES) return t
  }

  // 2. Frontmatter tags
  const tagsMatch = content.match(/^tags:\s*\[([^\]]+)\]/m)
  if (tagsMatch) {
    const tags = tagsMatch[1].toLowerCase()
    for (const key of Object.keys(ROUTES)) {
      if (tags.includes(key)) return key
    }
  }

  // 3. Filename signals
  if (lower.startsWith('voice') || lower.includes('voice-capture') || lower.includes('voice memo')) return 'voice'
  if (lower.includes('meeting') || lower.includes('standup') || lower.includes('1-1') || lower.includes('call with')) return 'meeting'
  if (lower.includes('quote')) return 'quote'
  if (lower.includes('idea')) return 'idea'
  if (lower.includes('concept')) return 'concept'
  if (lower.includes('tool') || lower.includes('plugin')) return 'tool'
  if (lower.includes('journal') || lower.includes('daily')) return 'journal'

  // 4. Content signals (first 20 lines)
  const preview = content.split('\n').slice(0, 20).join('\n').toLowerCase()
  if (preview.includes('attendees:') || preview.includes('action items')) return 'meeting'
  if (preview.match(/^>\s+/m)) return 'quote'

  return 'default'
}

async function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try { await Bun.write(LOG_FILE, line, { append: true } as any) } catch {}
  process.stdout.write(line)
}

async function loadState(): Promise<Set<string>> {
  try {
    const raw = await readFile(STATE_FILE, 'utf8')
    return new Set(JSON.parse(raw).processed || [])
  } catch {
    return new Set()
  }
}

async function saveState(processed: Set<string>) {
  await Bun.write(STATE_FILE, JSON.stringify({
    processed: [...processed],
    updated: new Date().toISOString()
  }, null, 2))
}

async function main() {
  const now = Date.now()
  const processed = await loadState()
  let routed = 0

  const entries = await readdir(INBOX).catch(() => [] as string[])

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue
    if (processed.has(entry)) continue

    const filePath = join(INBOX, entry)
    const fileStat = await stat(filePath).catch(() => null)
    if (!fileStat) continue

    const ageMs = now - fileStat.mtimeMs
    if (ageMs < MAX_AGE_MS) continue

    const content = await readFile(filePath, 'utf8').catch(() => '')
    const category = classify(entry, content)
    const dest = ROUTES[category]

    await mkdir(dest, { recursive: true })
    const destPath = join(dest, entry)

    if (existsSync(destPath)) {
      processed.add(entry)
      continue
    }

    await rename(filePath, destPath)
    processed.add(entry)
    routed++
    await log(`ROUTED: "${entry}" → ${category}`)
    if (category === 'default') {
      // Silent mis-route alert — the type field wasn't recognised
      fetch('http://localhost:31337/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Inbox router: fallback route used for "${entry}" — check frontmatter type field` })
      }).catch(() => {})
    }
  }

  await saveState(processed)
  await log(`Run complete — ${routed} file(s) routed`)
}

main().catch(console.error)
