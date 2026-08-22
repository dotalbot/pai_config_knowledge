# jelly-life-os

Dom's private LifeOS install — the `~/.claude` tree behind JellyPai.

**Private forever.** This repository holds identity, goals, project state, hooks,
skills and system configuration. It is never to be pushed to a public remote or
excerpted into public artifacts.

## What this is

LifeOS is an AI harness: it captures what you're trying to achieve and conveys that
intent into every task, then verifies the output against it. JellyPai is the digital
assistant that runs on it.

| | |
|---|---|
| LifeOS | 7.40.4 |
| Algorithm | 8.20.2 |
| System prompt | 3.7.3 |
| Cortex (memory) | 8.3.0 |

Upstream project: [danielmiessler/PAI](https://github.com/danielmiessler/PAI). This
install has diverged and is not a fork intended for upstream contribution.

## Layout

    LIFEOS/          the system — Algorithm, Memory, Tools, Pulse, docs
    LIFEOS/USER/     identity, TELOS, config, integrations
    hooks/           deterministic enforcement at Claude Code events
    skills/          domain capabilities
    CLAUDE.md        routing table, loaded every session

## Not in this repository

Excluded by `.gitignore` and deliberately so: `.env` and credentials, `CONTACTS.md`
(other people's data), `OPINIONS.md`, finances, health, memory state and security logs.

## History

Migrated from PAI 5.0.0 to LifeOS 7.40.4 on 2026-08-20. The migration completed
2026-08-21; the retired `PAI/` tree is archived outside this repository.
