---
id: kb_9f66c968236b
type: idea
title: "Pulse tailnet binding and TLS — why one interface, not 0.0.0.0"
tags: [pulse, security, tailscale, tls, networking, lifeos, voice]
status: evergreen
quality: 8
confidence: 0.95
source_kind: internal
source_session: 34561945-e99b-4457-a017-cfa156c4921b
created: 2026-08-22
updated: 2026-08-22
convention: kb-v3
related:
  - slug: obsidian-vault-structure-and-inbox-router
    type: related
  - slug: lifeos-pai-migration
    type: caused-by
---

# Pulse tailnet binding and TLS

> **ANSWER FIRST:** Pulse binds **two** listeners — the Tailscale address
> `100.125.86.118:31337` and `127.0.0.1:31337` — never `0.0.0.0`. TLS is on for
> the tailnet listener only; loopback stays plain HTTP on purpose. The cert comes
> from `tailscale cert`, not mkcert.

Recorded 2026-08-22. Verified live with `ss -tlnp` and by reading the service unit
and `pulse.ts`, not from memory.

## The binding decision

Pulse has **no route authentication**. Anything that can reach the port gets the
dashboard. That single fact drives the whole design.

    0.0.0.0          →  LAN + public IPv6 + Docker bridges + tailnet   ✗ rejected
    100.125.86.118   →  tailnet only                                   ✓ chosen
    127.0.0.1        →  in-process callers (hooks, /notify)            ✓ also bound

This host is multi-homed: it has a LAN address, a public IPv6 address, and Docker
bridge interfaces. Binding `0.0.0.0` would publish an unauthenticated dashboard on
every one of them. Binding exactly one interface is the narrow option.

Set in `~/.config/systemd/user/lifeos-pulse.service`:

    Environment=LIFEOS_PULSE_BIND_HOST=100.125.86.118

`pulse.ts` also supports `LIFEOS_PULSE_BIND_ALL=1` for `0.0.0.0`. Prefer
`BIND_HOST` unless every interface genuinely needs it.

## Why TWO listeners, not one

`Bun.serve` binds ONE hostname per call. When `BIND_HOST` names a specific
interface, Pulse starts two listeners sharing one handler:

    Bun.serve(100.125.86.118:31337)  ← phone on the tailnet, HTTPS
    Bun.serve(127.0.0.1:31337)       ← hooks and skills, plain HTTP

**Without the loopback listener every in-process caller of
`http://localhost:31337` breaks** — the `/notify` voice calls from hooks and
skills all use localhost. This is the non-obvious part: dropping the loopback
bind silently kills voice notifications.

## Why TLS, and why only on the tailnet side

Browsers grant microphone access only in a **secure context** — `https://` or
`http://localhost`. Reaching Pulse from a phone over the tailnet is neither, so
the `/talk` mic would be blocked without a real certificate.

`tailscale cert <magicdns-name>` issues a genuine Let's Encrypt cert for the
tailnet name. That is what Pulse consumes — **not mkcert**, which would produce a
cert the phone does not trust.

Loopback deliberately stays plain HTTP: `localhost` is already a secure context,
so encrypting it would break every hook for no security gain.

    const useTls = tlsOptions && hostname !== "127.0.0.1"

If the cert or key is unreadable, Pulse **fails loudly but keeps serving plain
HTTP** — a missing cert degrades the mic, it does not take the dashboard down.

## Gotcha — the rebinding guard

Both `BIND_HOST` and `BIND_ALL` disable the anti-DNS-rebinding `Host` check. That
guard only makes sense in loopback-only mode, because a non-loopback bind receives
non-loopback `Host` headers by design. Do not read its absence as an oversight.

## Verify it

    ss -tlnp | grep 31337
    # expect exactly two lines: 100.125.86.118:31337 and 127.0.0.1:31337

## Files

- `~/.config/systemd/user/lifeos-pulse.service` — bind host, `LIFEOS_DIR`
- `/home/jellypai/.claude/LIFEOS/PULSE/pulse.ts` — bind logic ~L1000-1030, TLS ~L1345-1390
- `/home/jellypai/.claude/LIFEOS/DOCUMENTATION/Pulse/PulseSystem.md`

The unit file also notes `PAI_DIR` is deliberately NOT set — the PAI tree was
archived, see [[lifeos-pai-migration]].
