export const meta = {
  name: 'upgrade-fanout',
  description: 'Fan out Upgrade-skill source checks in parallel under a hard deadline, fail-open',
  whenToUse: 'Invoked by skills/Upgrade/Workflows/Upgrade.md. Not run directly.',
  phases: [
    { title: 'Ground', detail: 'read current state so Prior Status tags have evidence' },
    { title: 'Sweep', detail: 'one agent per source, in parallel' },
  ],
}

// ---------------------------------------------------------------------------
// UpgradeFanout — the orchestration half of the Upgrade skill.
//
// The workflow doc owns WHAT a source is and HOW it is fetched (each source
// arrives here with its brief already written). This script owns only the
// mechanics the doc says it owns: the deadline, the fail-open behaviour, and
// the return shape.
//
// Written 2026-08-22. The Upgrade skill had referenced this path since it was
// authored, but the file never existed on this install — invoking /Upgrade
// failed at the fan-out step.
//
// TWO CONTRACT FACTS, learned the hard way on 2026-08-06 and recorded in the
// workflow doc. Both are load-bearing:
//   1. `args` arrives as a JSON STRING even when passed as a JSON value.
//   2. `AbortSignal` does not exist in this runtime — the deadline cannot be
//      implemented with an abort controller. It is enforced by racing each
//      agent against a timer and reporting whatever is back when it fires.
// ---------------------------------------------------------------------------

const DEADLINE_MS = 4 * 60 * 1000   // ~4 min ceiling, per the workflow doc
const MAX_SOURCES = 8               // ~8 agents; over-fan-out is the top failure mode

// args may be a JSON string OR an already-parsed object. Handle both.
function readArgs(raw) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

const input = readArgs(typeof args !== 'undefined' ? args : null)
const sources = Array.isArray(input.sources) ? input.sources.slice(0, MAX_SOURCES) : []
const groundingBrief = input.groundingBrief || ''

if (!sources.length) {
  return {
    findings: [],
    coverage: [],
    grounding: null,
    totals: { requested: 0, returned: 0, timedOut: 0, failed: 0 },
    error: 'no sources supplied — caller must pass args.sources: [{key, model, prompt}]',
  }
}

const FINDING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'technique', 'target', 'whatItIs', 'howItHelps', 'sourceLabel'],
        properties: {
          title: { type: 'string' },
          // The actual quote or code block. The workflow's rule: if "show me
          // the technique" has no answer, it does not ship.
          technique: { type: 'string' },
          // Which LifeOS file or component it would improve.
          target: { type: 'string' },
          whatItIs: { type: 'string' },
          howItHelps: { type: 'string' },
          sourceLabel: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
    skipped: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'reason'],
        properties: { item: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
}

// The deadline is a wall clock, not a per-agent budget: a source that has not
// returned when it fires is reported as timed out and the run reports anyway.
const startedAt = Date.now()
const deadline = new Promise((resolve) =>
  setTimeout(() => resolve({ __deadline: true }), DEADLINE_MS),
)

phase('Ground')

// Grounding runs alongside the sweep rather than before it. Prior Status tags
// need this evidence, but blocking the network-bound sweep on a local read
// would waste most of the deadline.
const groundingPromise = groundingBrief
  ? agent(groundingBrief, { label: 'ground:current-state', phase: 'Ground' })
      .then((r) => r)
      .catch(() => null)
  : Promise.resolve(null)

phase('Sweep')

log(`Sweeping ${sources.length} source(s), ${Math.round(DEADLINE_MS / 1000)}s ceiling`)

const results = await parallel(
  sources.map((src) => () =>
    Promise.race([
      agent(src.prompt, {
        label: `src:${src.key}`,
        phase: 'Sweep',
        schema: FINDING_SCHEMA,
        ...(src.model ? { model: src.model } : {}),
        ...(src.effort ? { effort: src.effort } : {}),
      })
        .then((data) => ({ key: src.key, status: 'ok', data }))
        .catch((err) => ({ key: src.key, status: 'failed', error: String(err) })),
      deadline.then(() => ({ key: src.key, status: 'timed_out' })),
    ]),
  ),
)

const grounding = await Promise.race([groundingPromise, deadline.then(() => null)])

// parallel() resolves a thrown thunk to null, so filter before use.
const settled = results.filter(Boolean)

const findings = []
const skipped = []
const coverage = []

for (const r of settled) {
  if (r.status === 'ok' && r.data) {
    const got = Array.isArray(r.data.findings) ? r.data.findings : []
    for (const f of got) findings.push({ ...f, source: r.key })
    for (const s of (r.data.skipped || [])) skipped.push({ ...s, source: r.key })
    coverage.push({ source: r.key, status: 'ok', findings: got.length })
  } else if (r.status === 'timed_out') {
    coverage.push({ source: r.key, status: 'timed_out' })
  } else {
    coverage.push({ source: r.key, status: 'failed', error: r.error })
  }
}

// Any source the caller asked for that produced no row at all (a thunk that
// resolved null) is still reported — silent omission would read as coverage.
for (const src of sources) {
  if (!coverage.some((c) => c.source === src.key)) {
    coverage.push({ source: src.key, status: 'failed', error: 'no result returned' })
  }
}

const totals = {
  requested: sources.length,
  returned: coverage.filter((c) => c.status === 'ok').length,
  timedOut: coverage.filter((c) => c.status === 'timed_out').length,
  failed: coverage.filter((c) => c.status === 'failed').length,
  findings: findings.length,
  elapsedMs: Date.now() - startedAt,
}

log(`Sweep done — ${totals.returned}/${totals.requested} returned, ${totals.findings} finding(s)`)

return { findings, skipped, coverage, grounding, totals }
