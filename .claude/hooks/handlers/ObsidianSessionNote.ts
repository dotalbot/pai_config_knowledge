/**
 * ObsidianSessionNote.ts — Write a session summary note to 07 PAI/ in the Obsidian vault.
 *
 * Parses the full session transcript at Stop time, extracts:
 *   - 🗣️ JellyPai voice lines → "Key exchanges"
 *   - 🔧 CHANGE bullets → "What changed"
 * Writes a structured markdown note to the vault's 07 PAI/ folder.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Vault path is configured centrally in LIFEOS/USER/INTEGRATIONS/obsidian.yaml
// (single source of truth — was hardcoded in 6 places before the 2026-08-20 migration).
// Falls back to the historical path if the config file is absent, so this never breaks.
const FALLBACK_VAULT = '/opt/docker/appdata/obsidian-jellybase/vault/OB_v2'
const FALLBACK_NOTES_DIR = '07 PAI'

function loadVaultConfig(): { vault: string; notesDir: string } {
  const cfg = join(process.env.LIFEOS_DIR || join(process.env.HOME || '', '.claude', 'LIFEOS'), 'USER', 'INTEGRATIONS', 'obsidian.yaml')
  try {
    if (existsSync(cfg)) {
      const text = readFileSync(cfg, 'utf8')
      const path = text.match(/^\s*path:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '')
      const notesDir = text.match(/^\s*session_notes_dir:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '')
      return { vault: path || FALLBACK_VAULT, notesDir: notesDir || FALLBACK_NOTES_DIR }
    }
  } catch { /* fall through to defaults */ }
  return { vault: FALLBACK_VAULT, notesDir: FALLBACK_NOTES_DIR }
}

const { vault: VAULT, notesDir: NOTES_SUBDIR } = loadVaultConfig()
const PAI_DIR = join(VAULT, NOTES_SUBDIR)

interface SessionNote {
  date: string
  time: string
  exchanges: string[]
  changes: string[]
}

function parseSessionFromTranscript(transcriptPath: string): SessionNote {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toISOString().slice(11, 16).replace(':', '-')

  let raw = ''
  try {
    raw = readFileSync(transcriptPath, 'utf8')
  } catch {
    return { date, time, exchanges: [], changes: [] }
  }

  const exchanges: string[] = []
  const changes: string[] = []

  // Parse JSONL entries
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    let entry: any
    try { entry = JSON.parse(line) } catch { continue }

    const content = entry?.message?.content
    if (!Array.isArray(content)) continue
    if (entry?.message?.role !== 'assistant') continue

    for (const block of content) {
      const text: string = typeof block === 'string' ? block : block?.text ?? ''
      if (!text) continue

      // Extract 🗣️ JellyPai: lines
      const voiceMatch = text.match(/🗣️[^:]*:\s*(.+?)(?:\n|$)/g)
      if (voiceMatch) {
        for (const m of voiceMatch) {
          const clean = m.replace(/🗣️[^:]*:\s*/, '').trim()
          if (clean && !exchanges.includes(clean)) exchanges.push(clean)
        }
      }

      // Extract 🔧 CHANGE: bullet lines
      const changeSectionMatch = text.match(/🔧[^:]*:.*?(?=\n[🔄📃✅🗣️]|\n---|\n##|$)/s)
      if (changeSectionMatch) {
        const bullets = changeSectionMatch[0].match(/[-•]\s+.+/g)
        if (bullets) {
          for (const b of bullets) {
            const clean = b.replace(/^[-•]\s+/, '').trim()
            if (clean && !changes.includes(clean)) changes.push(clean)
          }
        }
      }
    }
  }

  return { date, time, exchanges, changes }
}

function buildNoteContent(note: SessionNote): string {
  const { date, exchanges, changes } = note
  const now = new Date()
  const datetime = now.toISOString().slice(0, 16).replace('T', ' ')

  const exchangeLines = exchanges.length > 0
    ? exchanges.map(e => `- ${e}`).join('\n')
    : '- (no exchanges captured)'

  const changeLines = changes.length > 0
    ? changes.map(c => `- ${c}`).join('\n')
    : '- (no changes recorded)'

  return `---
title: "PAI Session ${date}"
date: ${datetime}
type: pai-session
tags: [pai, session, jellypai]
---

## Key exchanges

${exchangeLines}

## What changed

${changeLines}

---
*JellyPai — auto-written at session end*
`
}

export async function writeObsidianSessionNote(transcriptPath: string): Promise<void> {
  try {
    mkdirSync(PAI_DIR, { recursive: true })

    const note = parseSessionFromTranscript(transcriptPath)

    // Skip if nothing happened (empty session)
    if (note.exchanges.length === 0 && note.changes.length === 0) return

    const filename = `Session ${note.date} ${note.time}.md`
    const filePath = join(PAI_DIR, filename)
    const content = buildNoteContent(note)

    writeFileSync(filePath, content, 'utf8')
    console.error(`[ObsidianSessionNote] Written: ${filename}`)
  } catch (err) {
    console.error('[ObsidianSessionNote] Error:', err)
  }
}
