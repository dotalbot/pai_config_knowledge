# PAI Host Setup — jellybase

> Server-level dependencies required BEYOND the standard PAI installer.
> Updated: 2026-06-09 | Host: jellybase | OS: Linux (Ubuntu/Debian)

## PAI Service Account

| | |
|---|---|
| **PAI user** | `jellypai` |
| **Sudo user** | `jellyfish` (has sudo, used for system-level installs) |
| **PAI root** | `/home/jellypai/.claude/` |
| **Shared files** | `/home/jellypai/Shared/` |

---

## System Services

### pai-pulse (systemd)

Pulse Life Dashboard, port 31337.

```bash
# Service file: /etc/systemd/system/pai-pulse.service
sudo systemctl enable pai-pulse
sudo systemctl start pai-pulse
```

Config: `/home/jellypai/.claude/PAI/PULSE/PULSE.toml`

### ObsidianCaptureServer

Obsidian webhook capture server (PID via bun, auto-started).

```bash
bun run /home/jellypai/.claude/PAI/Tools/ObsidianCaptureServer.ts
```

### opencode

OpenCode AI inference server, port 7878.

```bash
opencode serve --port 7878
```

---

## System Packages (apt)

Install as sudo user (`jellyfish`):

```bash
sudo apt-get install -y pandoc python3-pip
```

| Package | Version | Purpose |
|---------|---------|---------|
| `pandoc` | 3.1.3 | Universal document converter — docx/pptx/xlsx → markdown |
| `python3-pip` | system | Python package manager |

---

## Python Packages

Install as **both** `jellyfish` (sudo) and `jellypai` (PAI user):

```bash
pip3 install --break-system-packages python-docx python-pptx openpyxl
```

| Package | Version | Purpose |
|---------|---------|---------|
| `python-docx` | 1.2.0 | Read/write `.docx` files programmatically |
| `python-pptx` | 1.0.2 | Read/write `.pptx` — slides, text, speaker notes |
| `openpyxl` | 3.1.5 | Read/write `.xlsx` — Excel with formulas, sheets, cell data |

> **Note:** `--break-system-packages` required on Ubuntu 22.04+ (PEP 668). Packages install to `~/.local/lib/python3.x/`.

---

## Bun

Installed at `/home/jellypai/.bun/bin/bun`. Install via:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Claude Code CLI

Installed at `/home/jellypai/.bun/bin/claude`. Global install via bun:

```bash
bun install -g @anthropic-ai/claude-code
```

Auth: OAuth credentials at `/home/jellypai/.claude/.credentials.json`.

---

## Obsidian Vault

Mounted at: `/opt/docker/appdata/obsidian-jellybase/vault/OB_v2/`

Requires Docker with Obsidian container. Vault is accessed directly from PAI tools.

---

## Shared File Library

```
/home/jellypai/Shared/
  images/       — screenshots, diagrams
  documents/    — PDFs, Word docs, specs
  references/   — web content, articles
  code/         — snippets, configs
  index.jsonl   — searchable file manifest
```

Files ingested by JellyPai are stored here with `.meta.json` sidecars and indexed in `index.jsonl`.

---

## Environment Variables

Set in `/home/jellypai/.claude/.env` (loaded by Pulse via `EnvironmentFile`):

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | Voice synthesis (not currently set — voice disabled) |
| `PAI_PULSE_HEALTH_SITES` | Comma-separated `name\|url` pairs for healthcheck job |
| `AIRGRADIENT_TOKEN` | Air quality polling (not set — job skips gracefully) |

---

## Known Issues / Notes

- `afplay` (macOS audio player) referenced in `VoiceServer/voice.ts` — not available on Linux. Voice playback is effectively disabled until replaced with `paplay` or similar.
- `Interceptor` browser automation skill is macOS-only (Homebrew). Not available on this host.
- `assistant-tasks` cron job runs every minute (`* * * * *`) — stub script at `PULSE/Assistant/checks/tasks.ts` returns `NO_ACTION`. Full implementation pending.
- Pulse state persists to `PULSE/state/state.json`. If cron jobs accumulate 3 consecutive failures, reset `consecutiveFailures` to 0 in that file and restart the service.
