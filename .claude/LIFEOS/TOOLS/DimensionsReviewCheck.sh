#!/usr/bin/env bash
# DimensionsReviewCheck — one-shot 2026-09-19 review of the TELOS dimension rings.
#
# WHY: CURRENT_STATE was populated 2026-09-12 (commit 2d106ba) after the Pulse
# rings had read 0/100 since install. The scores derive from have/partial/missing
# markers rather than from typed-in percentages, so they only stay honest if the
# markers get revisited. A week is long enough for the first drift and short
# enough that the reasoning is still recallable.
#
# Two open questions from that session, neither answered at the time:
#   1. Relationships derived 80; Dom's own read was 70. Something is written
#      stronger than he'd score it — likely "actually seeing friends" or
#      "nothing left unsaid".
#   2. FREEDOM's "afternoon nap possible without guilt = partial" was the DA's
#      inference, not Dom's statement. It is the sole reason freedom is 10 and
#      not 0. If wrong, set it to missing.
set -uo pipefail

STATE="$HOME/.claude/LIFEOS/USER/TELOS/LIFEOS_STATE.json"
CUR="$HOME/.claude/LIFEOS/USER/TELOS/CURRENT_STATE"
OUT="$HOME/.claude/LIFEOS/MEMORY/STATE/dimensions-review.md"

# Baseline recorded at write time, 2026-09-12.
read -r -d '' BASE <<'EOF'
health 21
money 50
freedom 10
creative 50
relationships 80
EOF

now=$(python3 -c "
import json
d=json.load(open('$STATE')).get('dimensions',{})
for k in ['health','money','freedom','creative','relationships']:
    p=d.get(k,{}).get('pct')
    print(k, '-' if p is None else p)
" 2>/dev/null || echo "READ-FAILED")

changed=0
while read -r dim base; do
  cur=$(echo "$now" | awk -v d="$dim" '$1==d{print $2}')
  [ "$cur" != "$base" ] && changed=$((changed+1))
done <<< "$BASE"

stale=$(find "$CUR" -name '*.md' ! -name 'README.md' -mtime +6 2>/dev/null | wc -l)
total=$(find "$CUR" -name '*.md' ! -name 'README.md' 2>/dev/null | wc -l)

{
  echo "# Dimension review — $(date -u +%Y-%m-%d)"
  echo
  echo "One week on from populating CURRENT_STATE. Not a health check of the"
  echo "code: the rings render correctly. This asks whether the NUMBERS are"
  echo "still true, which only Dom can answer."
  echo
  echo "## Scores"
  echo
  echo '```'
  echo "dimension       baseline(09-12)  now"
  while read -r dim base; do
    cur=$(echo "$now" | awk -v d="$dim" '$1==d{print $2}')
    printf "%-14s %8s %12s\n" "$dim" "$base" "${cur:-?}"
  done <<< "$BASE"
  echo '```'
  echo
  if [ "$changed" -eq 0 ]; then
    echo "**Nothing moved in 7 days.** Expected — these are slow dimensions, and"
    echo "a week of no change is not a failure. The question is whether the"
    echo "markers still describe reality, not whether the number shifted."
  else
    echo "**$changed dimension(s) moved.** Worth a look at which markers flipped"
    echo "and whether the change is real or a marker being reworded."
  fi
  echo
  echo "$stale of $total marker files untouched in the last week."
  echo
  echo "## The two open calls from 2026-09-12"
  echo
  echo "1. **Relationships reads 80, Dom said 70.** Ten markers, six have, four"
  echo "   partial, zero missing. To land on 70, one \`have\` needs demoting."
  echo "   Most likely candidates: \"actually seeing friends\" or \"nothing left"
  echo "   unsaid\". Ask which is written stronger than he'd score it."
  echo
  echo "2. **FREEDOM's nap marker was inferred, not stated.** The DA wrote"
  echo "   \"occasionally, at weekends\" to avoid a flat 0. Dom never said it."
  echo "   It is the entire difference between freedom 10 and freedom 0."
  echo "   Confirm or set to missing."
  echo
  echo "## The one worth re-asking"
  echo
  echo "FREEDOM's leading indicator: fifteen quiet minutes, settled enough to"
  echo "read a book and absorb it. Recorded NOT reachable on 2026-08-24 and"
  echo "again on 2026-09-12. IDEAL_STATE says if that returns the dimension is"
  echo "moving, and if it does not, nothing else here is really progressing."
  echo "That single question is worth more than re-scoring all five."
  echo
  echo "_Probe: LIFEOS/TOOLS/DimensionsReviewCheck.sh · remove the crontab line once reviewed._"
} > "$OUT"

# Surface it — a file written into MEMORY/STATE that nobody is told about is
# not a reminder. Pulse speaks it; failure here must not fail the probe.
curl -s -X POST http://127.0.0.1:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Dimension review is due. One week since you set the TELOS rings — two open calls waiting on you."}' \
  >/dev/null 2>&1 || true

echo "[DimensionsReviewCheck] wrote $OUT"
