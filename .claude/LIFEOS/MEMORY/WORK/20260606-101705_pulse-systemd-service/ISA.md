---
task: "Create systemd service for PAI Pulse daemon"
slug: 20260606-101705_pulse-systemd-service
effort: e2
effort_source: classifier
phase: complete
progress: 18/18
mode: interactive
started: 2026-06-06T10:17:05Z
updated: 2026-06-06T10:17:05Z
---

## Problem

PAI Pulse (`pulse.ts`) is not running and has no persistent service. Port 31337 is down. The `start-pulse.sh` file is macOS-specific (keychain unlock). On this Linux host, the user systemd bus is unavailable (no `XDG_RUNTIME_DIR`, no D-Bus session for `jellypai`), and linger is not enabled. Pulse must be configured as a system-level service so it starts at boot and recovers from failures automatically.

## Goal

A `pai-pulse.service` system unit file exists at `/etc/systemd/system/` (or staged for install), runs Pulse as the `jellypai` user via `/home/jellypai/.bun/bin/bun run pulse.ts` from the correct working directory, restarts on failure, and survives reboots. Dom can start it with a single sudo command.

## Criteria

- [x] ISC-1: Service file written to `/home/jellypai/.claude/PAI/PULSE/pai-pulse.service`
- [x] ISC-2: `[Unit]` section contains `Description=PAI Pulse Life Dashboard`
- [x] ISC-3: `[Unit]` section has `After=network-online.target`
- [x] ISC-4: `[Unit]` section has `Wants=network-online.target`
- [x] ISC-5: `[Service]` section has `Type=simple`
- [x] ISC-6: `[Service]` section has `User=jellypai`
- [x] ISC-7: `[Service]` section has `Group=jellypai`
- [x] ISC-8: `[Service]` section has `WorkingDirectory=/home/jellypai/.claude/PAI/PULSE`
- [x] ISC-9: `[Service]` section has `ExecStart=/home/jellypai/.bun/bin/bun run pulse.ts`
- [x] ISC-10: `[Service]` section has `Restart=on-failure`
- [x] ISC-11: `[Service]` section has `RestartSec=10`
- [x] ISC-12: `[Service]` section has `Environment=HOME=/home/jellypai`
- [x] ISC-13: `[Service]` section has `Environment=PAI_DIR=/home/jellypai/.claude/PAI`
- [x] ISC-14: `[Service]` section has `Environment=PATH=` including `/home/jellypai/.bun/bin`
- [x] ISC-15: `[Service]` section has `SyslogIdentifier=pai-pulse`
- [x] ISC-16: `[Install]` section has `WantedBy=multi-user.target`
- [x] ISC-17: Install instructions are documented for Dom to copy + enable with sudo
- [x] ISC-18: Anti: service does not use `ExecStart` that would run as root (User=jellypai is set)

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | file-exists | file exists at path | present | Bash: `ls /home/jellypai/.claude/PAI/PULSE/pai-pulse.service` |
| ISC-2 | content | grep for Description line | match | Bash: `grep "Description=PAI Pulse" pai-pulse.service` |
| ISC-3 | content | grep for After= | match | Bash: `grep "After=network-online" pai-pulse.service` |
| ISC-4 | content | grep for Wants= | match | Bash: `grep "Wants=network-online" pai-pulse.service` |
| ISC-5 | content | grep for Type=simple | match | Bash: `grep "Type=simple" pai-pulse.service` |
| ISC-6 | content | grep for User=jellypai | match | Bash: `grep "User=jellypai" pai-pulse.service` |
| ISC-7 | content | grep for Group=jellypai | match | Bash: `grep "Group=jellypai" pai-pulse.service` |
| ISC-8 | content | grep for WorkingDirectory= | match | Bash: `grep "WorkingDirectory=.*PULSE" pai-pulse.service` |
| ISC-9 | content | grep for ExecStart with bun | match | Bash: `grep "ExecStart=.*bun run pulse.ts" pai-pulse.service` |
| ISC-10 | content | grep for Restart=on-failure | match | Bash: `grep "Restart=on-failure" pai-pulse.service` |
| ISC-11 | content | grep for RestartSec= | match | Bash: `grep "RestartSec=" pai-pulse.service` |
| ISC-12 | content | grep for HOME env | match | Bash: `grep "Environment=HOME=" pai-pulse.service` |
| ISC-13 | content | grep for PAI_DIR env | match | Bash: `grep "Environment=PAI_DIR=" pai-pulse.service` |
| ISC-14 | content | grep for PATH with bun | match | Bash: `grep "Environment=PATH=.*bun" pai-pulse.service` |
| ISC-15 | content | grep for SyslogIdentifier | match | Bash: `grep "SyslogIdentifier=pai-pulse" pai-pulse.service` |
| ISC-16 | content | grep for WantedBy=multi-user | match | Bash: `grep "WantedBy=multi-user.target" pai-pulse.service` |
| ISC-17 | inspection | install instructions present in output | present | Read: SUMMARY block contains sudo commands |
| ISC-18 | content | no ExecStart without User= in same file | pass | Bash: `grep -c "User=jellypai" pai-pulse.service` ≥1 |

## Decisions

- 2026-06-06: Chose system service (`/etc/systemd/system/`) over user service (`~/.config/systemd/user/`) because the user systemd bus is unavailable for `jellypai` (no D-Bus session, no XDG_RUNTIME_DIR, no linger enabled). User service path requires `sudo loginctl enable-linger jellypai` AND a new login session to activate; system service requires only one sudo command to install and enables immediately.
