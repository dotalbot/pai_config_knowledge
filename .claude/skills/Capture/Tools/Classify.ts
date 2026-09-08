#!/usr/bin/env bun
/**
 * Classify a raw capture string into a CaptureKind (US-7).
 *
 * Deterministic and model-free: classification must be fast, testable, and
 * identical across runs. Ambiguity resolves to a default and is reported, never
 * asked about (AC-7.7).
 */

import type { CaptureKind } from "./types.ts";

export interface Classification {
  kind: CaptureKind;
  url?: string;
  /** Channel handle, video id, or domain, where the pattern yields one. */
  ref?: string;
  /** Why this kind was chosen; surfaced to the principal in one line. */
  reason: string;
  text?: string;
}

const CODE_HOSTS = ["github.com", "gitlab.com", "codeberg.org", "sr.ht"];

/** Explicit user intent overrides pattern matching entirely. */
const SITE_HINT = /\b(site|blog|website|publication)\b/i;
const CHANNEL_HINT = /\bchannel\b/i;

export function extractUrl(input: string): string | undefined {
  const m = input.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (m) return m[0].replace(/[.,;:]+$/, "");
  // Bare domain: example.com or www.example.com/path
  const bare = input
    .trim()
    .match(/^(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(\/\S*)?$/i);
  if (bare) return `https://${bare[0].replace(/^www\./i, "")}`;
  return undefined;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isYouTube(host: string): boolean {
  return host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com";
}

export function classify(input: string): Classification {
  const text = input.trim();
  if (!text) {
    return { kind: "snippet", reason: "empty input", text };
  }

  const url = extractUrl(text);
  if (!url) {
    return { kind: "snippet", reason: "no URL present", text };
  }

  const host = hostOf(url);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "snippet", reason: "unparseable URL", text };
  }
  const path = parsed.pathname;

  if (isYouTube(host)) {
    // Channel forms: /@handle, /channel/UC..., /c/Name, /user/Name
    const chan = path.match(/^\/(?:@([^/]+)|channel\/([^/]+)|c\/([^/]+)|user\/([^/]+))\/?$/);
    if (chan) {
      const ref = chan[1] ?? chan[2] ?? chan[3] ?? chan[4];
      return { kind: "channel", url, ref, reason: "YouTube channel URL", text };
    }
    // Video forms: /watch?v=ID, youtu.be/ID, /shorts/ID, /live/ID
    const vid =
      parsed.searchParams.get("v") ??
      (host === "youtu.be" ? path.slice(1) : undefined) ??
      path.match(/^\/(?:shorts|live|embed)\/([^/?]+)/)?.[1];
    if (vid) {
      return { kind: "video", url, ref: vid, reason: "YouTube video URL", text };
    }
    if (CHANNEL_HINT.test(text)) {
      return { kind: "channel", url, reason: "YouTube URL described as a channel", text };
    }
    return { kind: "video", url, reason: "YouTube URL, defaulted to video", text };
  }

  if (CODE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { kind: "tool", url, ref: host, reason: "code host", text };
  }

  // Explicit intent beats structure.
  if (SITE_HINT.test(text)) {
    return { kind: "site", url, ref: host, reason: "described as a site or blog", text };
  }

  // Bare domain with no meaningful path is a site, not an article.
  if (path === "/" || path === "") {
    return { kind: "site", url, ref: host, reason: "bare domain, no article path", text };
  }

  return { kind: "article", url, ref: host, reason: "URL with an article path", text };
}

if (import.meta.main) {
  const input = process.argv.slice(2).join(" ");
  console.log(JSON.stringify(classify(input), null, 2));
}
