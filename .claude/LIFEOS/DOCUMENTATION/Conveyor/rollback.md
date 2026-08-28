# Rollback — ConveyorWorker

Exact commands. The claim sweeper and ConveyorDesk are unaffected by all of them.

## 1. Stop and disable the worker

    export XDG_RUNTIME_DIR=/run/user/$(id -u)
    systemctl --user disable --now lifeos-conveyor-worker.timer
    systemctl --user stop lifeos-conveyor-worker.service

## 2. Confirm the claim sweeper still runs

    systemctl --user list-timers lifeos-conveyor --no-pager

`lifeos-conveyor.timer` must still be listed and active. It is a separate unit
and is not touched by step 1.

## 3. Leave the queue alone

No queue command is part of rollback. Jobs in `processing/` stay there; the
sweeper keeps claiming new ones. Capture and transport continue working.

## 4. Remove the unit files, only after stopping

    rm ~/.config/systemd/user/lifeos-conveyor-worker.{timer,service}
    systemctl --user daemon-reload

## 5. Retain for diagnosis

Keep `LIFEOS/TOOLS/ConveyorWorker.ts`, `conveyor-worker.jsonl` and
`conveyor-worker-heartbeat.json`. Removing the timer stops the behaviour;
deleting the evidence stops the diagnosis.

## 6. Verify ConveyorDesk is unaffected

    ls ~/conveyor/new ~/conveyor/processing
    sha256sum ~/conveyor/bin/conveyor_receipt.py

Expected receipt helper hash:
`829f673a4a0bcf7fdd81b2c29fe99f0d3ab4f5e9c51019b0d32119670c0249cd`
