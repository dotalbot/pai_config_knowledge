#!/usr/bin/env bun
/**
 * ObsidianSessionNote.hook.ts — Auto-write session summary to 07 PAI/ in Obsidian vault.
 *
 * TRIGGER: Stop
 * NEEDS TRANSCRIPT: Yes
 *
 * Parses the full session transcript, extracts 🗣️ exchanges and 🔧 changes,
 * writes a structured markdown note to the vault's 07 PAI/ folder.
 * Skips silently if nothing was captured (empty/ping sessions).
 */

import { readHookInput } from './lib/hook-io'
import { writeObsidianSessionNote } from './handlers/ObsidianSessionNote'

const input = await readHookInput()
if (!input?.transcript_path) process.exit(0)

await writeObsidianSessionNote(input.transcript_path)
