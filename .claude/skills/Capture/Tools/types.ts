/**
 * Shared types for the Capture skill.
 *
 * The reference layer is deliberately NOT an inbox: entries have no terminal
 * state and carry no processing debt. See SPEC.md "What this is NOT".
 */

export type Medium = "youtube" | "web" | "snippet" | "tool";
export type AnchorMedium = "youtube" | "site";

/** Vault-Guide tool lifecycle values (US-5). */
export type ToolStatus = "to-try" | "testing" | "adopted" | "rejected";

export type ItemStatus = "captured" | "unfetchable" | ToolStatus;

export type CaptureKind =
  | "video"
  | "channel"
  | "article"
  | "site"
  | "tool"
  | "snippet";

/** Where each kind lands under ~/obsidian/Reference/. */
export const KIND_FOLDER: Record<CaptureKind, string> = {
  video: "YouTube",
  channel: "Channels",
  article: "Web",
  site: "Sites",
  tool: "Tools",
  snippet: "Web",
};

/** An anchor is created on explicit request or the Nth item from one source. */
export const ANCHOR_THRESHOLD = 3;

export const GEN_START = "<!-- capture:generated:start -->";
export const GEN_END = "<!-- capture:generated:end -->";

export interface IndexEntry {
  /** Vault-relative path, e.g. "Reference/YouTube/Some Video.md". */
  path: string;
  title: string;
  kind: CaptureKind;
  medium: Medium | AnchorMedium;
  url?: string;
  author?: string;
  /** Channel name or site domain this item belongs to, if any. */
  source?: string;
  tags: string[];
  summary: string;
  captured: string;
  status: ItemStatus;
}

export interface SleepState {
  /** ISO timestamp; surfacing is suppressed until this moment. */
  until: string;
}

export interface ReferenceIndex {
  version: 1;
  updated: string;
  sleep?: SleepState;
  entries: IndexEntry[];
}

export function emptyIndex(): ReferenceIndex {
  return { version: 1, updated: new Date().toISOString(), entries: [] };
}
