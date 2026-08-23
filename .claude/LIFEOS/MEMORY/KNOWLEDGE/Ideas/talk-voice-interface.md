---
id: kb_f9d1317093df
type: idea
title: "/talk — phone-side voice interface with no server audio hardware"
tags: [pulse, voice, talk, tailscale, architecture, lifeos, inference]
status: evergreen
quality: 8
confidence: 0.95
source_kind: internal
source_session: 34561945-e99b-4457-a017-cfa156c4921b
created: 2026-08-22
updated: 2026-08-22
convention: kb-v3
related:
  - slug: pulse-tailnet-binding-and-tls
    type: part-of
  - slug: lifeos-pai-migration
    type: related
---

# /talk — the voice interface

> **ANSWER FIRST:** `https://<magicdns-name>:31337/talk` from a phone on the
> tailnet. **The phone does all the audio work** — browser `SpeechRecognition` in,
> `speechSynthesis` out. Only transcribed **text** crosses the wire. The server has
> no microphone, no ALSA device, no PulseAudio, and needs none.

Recorded 2026-08-22 from `pulse.ts`. Built 2026-08-22.

## The architecture, and why it is shaped this way

    ┌─ phone (browser) ─────────────┐        ┌─ server ──────────────┐
    │  SpeechRecognition  (listen)  │        │                       │
    │            │ transcribed TEXT │        │                       │
    │            ├─── POST /talk ──────────▶ │  Inference.ts         │
    │            │                  │        │       │               │
    │            ◀──── {"reply"} ────────────┤  ◀────┘               │
    │  speechSynthesis    (speak)   │        │                       │
    └───────────────────────────────┘        └───────────────────────┘

**No audio ever crosses the wire.** This box has neither an ALSA device nor a
PulseAudio server, so doing STT/TTS server-side was never an option — pushing both
ends onto the phone's browser turns that constraint into a simpler design.

`GET /talk` serves the mic page **inline** from `pulse.ts` rather than through the
Next.js export, so it does not depend on a dashboard rebuild.

## The contract

    POST /talk  {"prompt": "...", "level": "low|medium|high|max"}
             →  {"reply":  "..."}

- Empty prompt → **400**; prompt over 4,000 chars → **413**
- `level` defaults to `medium`; anything unrecognised falls back to `medium`
- Backend is `LIFEOS/TOOLS/Inference.ts` spawned per request (**not** a nested
  `claude` session — that is blocked by `CLAUDECODE`)

The system prompt is tuned for speech: plain spoken English, no markdown, no
bullets, no code blocks, no symbols a TTS engine would read literally, **under
roughly eighty words**, lead with the answer.

## Two hard requirements

**HTTPS is mandatory.** Browsers expose a microphone only in a **secure context**.
The tailnet listener therefore serves TLS with a real `tailscale cert`; loopback
stays plain HTTP because `localhost` is already a secure context. Full reasoning in
[[pulse-tailnet-binding-and-tls]].

**Tailnet-only by design.** Answering costs tokens, so `/talk` is deliberately not
reachable from anywhere the tailnet cannot see. This is a cost boundary as much as
a security one.

## Gotchas

- A fixed bug: the handler once read `finalText` only, so a correctly-transcribed
  phrase could vanish. Interim results are now folded in.
- Error surfaces are spoken in plain language — `service-not-allowed` becomes
  "the browser blocked speech recognition"; `no-speech` becomes "no speech
  detected — hold the button while talking".
- Speech recognition is a **browser** capability: it varies by browser and needs
  the button held while talking.

## Files

- `/home/jellypai/.claude/LIFEOS/PULSE/pulse.ts` — `TALK_PAGE_HTML` ~L807, routes ~L1058-1100
- `/home/jellypai/.claude/LIFEOS/TOOLS/Inference.ts` — the answering backend
- `~/.config/systemd/user/lifeos-pulse.service` — "dashboard, voice, cron, /talk"
