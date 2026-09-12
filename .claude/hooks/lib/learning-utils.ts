/**
 * Shared Learning Utilities
 *
 * Categorization logic for learnings across the hook system.
 * Used by: RatingCapture, WorkCompletionLearning
 */

/**
 * Categorize learning as SYSTEM (tooling/infrastructure) or ALGORITHM (task execution)
 *
 * SYSTEM = hook failures, tooling issues, infrastructure problems, system errors
 * ALGORITHM = task execution issues, approach errors, method improvements
 *
 * Check ALGORITHM first because user feedback about task execution is more valuable.
 * Default to ALGORITHM since most learnings are about task quality, not infrastructure.
 *
 * @param content - The main content to analyze
 * @param comment - Optional user comment to include in analysis
 */
export function getLearningCategory(content: string, comment?: string): 'SYSTEM' | 'ALGORITHM' {
  const text = `${content} ${comment || ''}`.toLowerCase();

  // ALGORITHM indicators - task execution/approach issues (check first)
  const algorithmIndicators = [
    /over.?engineer/,
    /wrong approach/,
    /should have asked/,
    /didn't follow/,
    /missed the point/,
    /too complex/,
    /didn't understand/,
    /wrong direction/,
    /not what i wanted/,
    /approach|method|strategy|reasoning/
  ];

  // SYSTEM indicators - tooling/infrastructure issues
  const systemIndicators = [
    /hook|crash|broken/,
    /tool|config|deploy|path/,
    /import|module|file.*not.*found/,
    /typescript|javascript|npm|bun/
  ];

  // Check ALGORITHM first (user feedback about approach is valuable)
  for (const pattern of algorithmIndicators) {
    if (pattern.test(text)) return 'ALGORITHM';
  }

  for (const pattern of systemIndicators) {
    if (pattern.test(text)) return 'SYSTEM';
  }

  // Default: learnings reflect task quality → ALGORITHM
  return 'ALGORITHM';
}

/**
 * Determine if a response represents a learning moment
 */
export function isLearningCapture(text: string, summary?: string, analysis?: string): boolean {
  const learningIndicators = [
    /problem|issue|bug|error|failed|broken/i,
    /fixed|solved|resolved|discovered|realized|learned/i,
    /troubleshoot|debug|investigate|root cause/i,
    /lesson|takeaway|now we know|next time/i,
  ];

  const checkText = `${summary || ''} ${analysis || ''} ${text}`;

  let indicatorCount = 0;
  for (const pattern of learningIndicators) {
    if (pattern.test(checkText)) {
      indicatorCount++;
    }
  }

  // If 2+ learning indicators, consider it a learning
  return indicatorCount >= 2;
}

/**
 * ARTIFACT REJECTION (2026-09-11) — the capture-quality fix.
 *
 * WHY: SessionHarvester matched CORRECTION_PATTERNS against every `type==='user'`
 * transcript entry. But a "user" entry is not only something the principal typed:
 * it also carries skill invocations, pasted files, hook context and tool results.
 * The regex /actually,?\s+/i fired on any of them. Measured 2026-09-11 across
 * MEMORY/LEARNING/{ALGORITHM,SYSTEM}: 136 captures, 113 triggered by "actually"
 * and 19 by "wait", with 22 files containing whole skill bodies and directory
 * listings stored as "learning". The corpus grew while its signal fell.
 *
 * A learning is something SAID, not something PASTED. These markers identify
 * machine-generated or quoted text that can never be a correction.
 */
const ARTIFACT_MARKERS: RegExp[] = [
  /^Base directory for this skill:/m,
  /^Contents of \/[^\n]+:/m,
  /<command-(name|message|args)>/,
  /<system-reminder>/,
  /^---\s*$[\s\S]{0,400}^(name|description|allowed-tools):/m, // skill/agent frontmatter
  /^\s*(##+\s+|```)/m,                                          // pasted markdown body or fence
  /^(total \d+|drwx|[-l]rw[-x])/m,                               // ls -la output
  /^\{[\s\S]*"[a-zA-Z_]+"\s*:/,                                // pasted JSON object
  /UserPromptSubmit hook additional context:/,
  /\[EXTERNAL CONTENT/,
  /<task-notification>|<teammate-message|teammate_id=/,          // inter-agent envelopes
  /^You are (performing|an?) [^\n]{0,80}(survey|agent|assistant)/mi, // agent briefs
  /"type"\s*:\s*"(idle_notification|task|tool_use)"/,           // serialized events
];

/** True when the text is a pasted artifact rather than something a human said. */
export function isTranscriptArtifact(text: string): boolean {
  if (typeof text !== "string" || !text) return false;
  return ARTIFACT_MARKERS.some((re) => re.test(text));
}

/**
 * The single admission test for a captured learning. Every writer must call this
 * before appending to MEMORY/LEARNING.
 *
 * Three conditions, all required:
 *  1. not a pasted artifact (see above)
 *  2. plausibly human-scale — a correction is a sentence or two, not a 500-char dump
 *  3. clears the existing 2-indicator substance bar (isLearningCapture)
 *
 * Returns the reason for rejection, or null when the text should be captured.
 */
export function rejectLearning(text: string, opts?: { maxChars?: number }): string | null {
  const maxChars = opts?.maxChars ?? 1200;
  if (typeof text !== "string" || text.trim().length < 20) return "too short";
  if (isTranscriptArtifact(text)) return "pasted artifact, not spoken text";
  if (text.length > maxChars) return `too long (${text.length} > ${maxChars} chars)`;
  // A typed correction is often short and plain ("no, the vault is at ~/obsidian").
  // Requiring 2 substance indicators discards those, so the bar applies only to
  // longer text where indicators are a fair test of whether anything was learned.
  if (text.length > 400 && !isLearningCapture(text)) return "no substance indicators";
  return null;
}
