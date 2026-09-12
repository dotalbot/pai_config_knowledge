#!/usr/bin/env bash
# ReflectionCorpusCheck — one-shot 2026-09-18 verdict on the ReflectionGate fix.
#
# WHY: ReflectionGate (commit cfda99e, 2026-09-11) closed the learn step's open
# loop after the corpus sat dead from 2026-06-12. Baseline at install: 8 entries,
# 1 carrying the schema-9 `reflection` field. The honest test is whether ordinary
# use grows that count without anyone pushing it — a claim only time can settle,
# which is why this is a dated probe and not another gate.
set -uo pipefail
F="$HOME/.claude/LIFEOS/MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl"
OUT="$HOME/.claude/LIFEOS/MEMORY/STATE/reflection-corpus-check.md"
BASE_TOTAL=8
BASE_S9=1

total=$(grep -c '[^[:space:]]' "$F" 2>/dev/null || echo 0)
s9=$(python3 -c "
import json,sys
n=0
for l in open('$F'):
    l=l.strip()
    if not l: continue
    try:
        if json.loads(l).get('reflection'): n+=1
    except Exception: pass
print(n)" 2>/dev/null || echo 0)

new=$(( s9 - BASE_S9 ))
if   [ "$new" -ge 5 ]; then verdict="WORKING — the gate is firing under ordinary use."
elif [ "$new" -ge 1 ]; then verdict="PARTIAL — $new new in 7 days. Firing, but rarer than expected; check whether completion claims are being detected."
else verdict="FAILED — zero new reflections in 7 days. The gate is not firing as designed, and THAT is the finding. Check hooks/ReflectionGate.hook.ts and MEMORY/STATE/reflection-gate-fired.json."
fi

{
  echo "# Reflection corpus — 7-day check"
  echo
  echo "**Ran:** $(date -Iseconds)"
  echo "**Baseline (2026-09-11):** $BASE_TOTAL entries, $BASE_S9 schema-9"
  echo "**Now:** $total entries, $s9 schema-9 (+$new)"
  echo
  echo "**Verdict:** $verdict"
  echo
  echo "Context: ReflectionGate commit cfda99e. Open store record on ISA registration remains the related question."
} > "$OUT"
echo "$verdict"
