#!/usr/bin/env bun
// PAI Obsidian Voice Webhook
// Accepts POST /voice-note from iOS Shortcut (via Tailscale).
// Writes transcribed note to 00 INBOX with voice frontmatter.
// Default port: 27337

import { join } from 'path'
import { mkdir } from 'fs/promises'

const PORT = parseInt(process.env.VOICE_WEBHOOK_PORT || '27337')
const VAULT = '/opt/docker/appdata/obsidian-jellybase/vault/OB_v2'
const INBOX = join(VAULT, '00 INBOX')
const SECRET = process.env.VOICE_WEBHOOK_SECRET || ''

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 16)
}

function slugDate(): string {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
}

function buildNote(transcription: string, title?: string): string {
  const ts = timestamp()
  const noteTitle = title || `Voice ${ts}`
  return `---
title: "${noteTitle}"
type: voice
tags: [inbox, voice]
date: ${ts}
---

${transcription.trim()}
`
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname !== '/voice-note' || req.method !== 'POST') {
      return new Response('Not found', { status: 404 })
    }

    // Optional secret check
    if (SECRET) {
      const auth = req.headers.get('x-pai-secret')
      if (auth !== SECRET) return new Response('Forbidden', { status: 403 })
    }

    let body: { transcription: string; title?: string }
    try {
      body = await req.json()
    } catch {
      return new Response('Bad request — expected JSON', { status: 400 })
    }

    if (!body.transcription?.trim()) {
      return new Response('Missing transcription', { status: 400 })
    }

    const filename = `Voice ${slugDate()}.md`
    const filePath = join(INBOX, filename)
    const content = buildNote(body.transcription, body.title)

    await mkdir(INBOX, { recursive: true })
    await Bun.write(filePath, content)

    console.log(`[${timestamp()}] Voice note saved: ${filename}`)
    return Response.json({ ok: true, file: filename })
  },
})

console.log(`PAI Voice Webhook listening on :${PORT}`)
console.log(`POST http://localhost:${PORT}/voice-note`)
if (SECRET) console.log('Secret auth: enabled')
