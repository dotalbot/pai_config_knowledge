#!/usr/bin/env bun
/**
 * DocIntegrity.hook.ts — Check cross-refs if system docs/hooks were modified
 *
 * PURPOSE:
 * Runs deterministic + inference-powered doc integrity checks when system
 * files (hooks, PAI docs, skills, components) were modified during the session.
 * Self-gating: returns instantly when no system files changed.
 *
 * TRIGGER: Stop
 *
 * NEEDS TRANSCRIPT: Yes (to detect which files were modified via tool_use entries)
 *
 * HANDLER: handlers/DocCrossRefIntegrity.ts
 */

import { readHookInput, parseTranscriptFromInput } from './lib/hook-io';
import { handleDocCrossRefIntegrity } from './handlers/DocCrossRefIntegrity';
import { handleRebuildArchSummary } from './handlers/RebuildArchSummary';

async function main() {
  const input = await readHookInput();
  if (!input) { process.exit(0); }

  // Prevent re-entrancy: Stop hooks fire again after each hook-blocked turn.
  // When stop_hook_active is true we are already inside a stop-hook cycle — exit
  // immediately so we don't block the turn from ending.
  if ((input as any).stop_hook_active) { process.exit(0); }

  const parsed = await parseTranscriptFromInput(input);

  try {
    await handleDocCrossRefIntegrity(parsed, input);
  } catch (err) {
    console.error('[DocIntegrity] Cross-ref handler failed:', err);
  }

  try {
    await handleRebuildArchSummary();
  } catch (err) {
    console.error('[DocIntegrity] Arch-summary handler failed:', err);
  }

  // v2.1.163: return additionalContext so the session is aware the integrity check ran
  const systemFilePatterns = ['.hook.ts', '/PAI/', '/skills/', 'CLAUDE.md', 'settings.json', 'PATTERNS.yaml'];
  const modifiedPaths: string[] = [];
  if (input.transcript_path) {
    try {
      const { readFileSync } = await import('fs');
      const lines = readFileSync(input.transcript_path, 'utf-8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          const name = entry.type === 'tool_use' ? entry.name : entry.message?.content?.find?.((b: any) => b.type === 'tool_use')?.name;
          const fp = entry.input?.file_path || entry.message?.content?.find?.((b: any) => b.type === 'tool_use')?.input?.file_path;
          if ((name === 'Write' || name === 'Edit') && fp && systemFilePatterns.some(p => fp.includes(p))) {
            modifiedPaths.push(fp);
          }
        } catch { /* skip malformed lines */ }
      }
    } catch { /* transcript unreadable — skip context output */ }
  }

  // Violations are logged to stderr only — no UI noise on clean runs.

  process.exit(0);
}

main().catch((err) => {
  console.error('[DocIntegrity] Fatal:', err);
  process.exit(0);
});
