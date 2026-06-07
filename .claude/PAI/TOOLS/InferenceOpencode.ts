#!/usr/bin/env bun
// InferenceOpencode.ts — PAI tool for OpenAI inference via local opencode serve
// Output contract: single JSON line matching AnvilProgress.ts format
// Usage: bun TOOLS/InferenceOpencode.ts --slug <slug> [--prompt <text>] [--model openai/gpt-5.4]

import { createWriteStream, type WriteStream } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"

type Args = { slug: string; prompt?: string; model: string; timeoutMs: number; pulseUrl: string; serverUrl: string; workdir: string }
type JsonRecord = Record<string, unknown>
type Paths = { eventsFile: string; finalFile: string }
type RunState = { timedOut: boolean; interrupted: boolean }
type TimeoutControl = { clear: () => void }
type SignalControl = { clear: () => void }
type RunResult = { verdict: "success"; accumulated: string } | { verdict: "error" | "timeout"; accumulated: string; reason: string }
type FinalInput = { verdict: "success" | "error" | "timeout"; exitCode: number | null; eventsFile: string; finalFile: string; durationMs: number; finalMessage: string; reason?: string }

const PULSE_TIMEOUT_MS = 2000
const POLL_INTERVAL_MS = 600

interface OcMessage {
  info: {
    id: string
    role: "user" | "assistant"
    finish?: string
    tokens?: { input: number; output: number; total: number }
    time: { created: number; completed?: number }
  }
  parts: Array<{ type: string; text?: string }>
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {
    model: "openai/gpt-5.4",
    timeoutMs: 120000,
    pulseUrl: "http://localhost:31337/notify",
    serverUrl: process.env.OPENCODE_SERVER ?? "http://localhost:7878",
    workdir: process.env.HOME ?? "/home/jellypai",
  }
  const seen = new Set<string>()
  const valueFor = (flag: string, inline: string | undefined, i: number): [string, number] => {
    if (inline !== undefined) return [inline, i]
    const v = argv[i + 1]
    if (v === undefined || v.startsWith("--")) throw new Error(`${flag} requires a value`)
    return [v, i + 1]
  }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith("--")) throw new Error(`unexpected positional argument: ${token}`)
    const eq = token.indexOf("="), flag = eq === -1 ? token : token.slice(0, eq), inline = eq === -1 ? undefined : token.slice(eq + 1)
    if (seen.has(flag)) throw new Error(`duplicate flag: ${flag}`)
    seen.add(flag)
    const [value, next] = valueFor(flag, inline, i); i = next
    switch (flag) {
      case "--slug": args.slug = nonEmpty(flag, value); break
      case "--prompt": args.prompt = nonEmpty(flag, value); break
      case "--model": args.model = nonEmpty(flag, value); break
      case "--timeout-ms": args.timeoutMs = positiveInt(flag, value); break
      case "--pulse-url": args.pulseUrl = validUrl(flag, value); break
      case "--server-url": args.serverUrl = validUrl(flag, value); break
      case "--workdir": args.workdir = nonEmpty(flag, value); break
      default: throw new Error(`unknown flag: ${flag}`)
    }
  }
  if (!args.slug) throw new Error("--slug is required")
  if (!/^[A-Za-z0-9._-]+$/.test(args.slug) || args.slug === "." || args.slug === "..") throw new Error("--slug must be alphanumeric with dots, underscores, or hyphens")
  return args as Args
}

function nonEmpty(flag: string, value: string): string { if (!value.length) throw new Error(`${flag} must not be empty`); return value }
function positiveInt(flag: string, value: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${flag} must be a positive integer`)
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`${flag} must be a positive safe integer`)
  return n
}
function validUrl(flag: string, value: string): string {
  try { return new URL(nonEmpty(flag, value)).toString() }
  catch (e: unknown) { throw new Error(`${flag} must be a valid URL: ${String(e)}`) }
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error) }
function asRecord(v: unknown): JsonRecord | null { return typeof v === "object" && v !== null && !Array.isArray(v) ? v as JsonRecord : null }
function homeDir(): string { const home = process.env.HOME; if (!home) throw new Error("HOME is not set"); return home }

async function readServerPassword(home: string): Promise<string | null> {
  const envVal = process.env.OPENCODE_SERVER_PASSWORD
  if (typeof envVal === "string" && envVal.trim().length > 0) return envVal.trim()
  try {
    const text = await readFile(join(home, ".claude", ".env"), "utf8")
    for (const raw of text.split("\n")) {
      const line = raw.trimStart()
      if (!line.startsWith("OPENCODE_SERVER_PASSWORD=")) continue
      const val = line.slice("OPENCODE_SERVER_PASSWORD=".length).replace(/[ \t\r]+$/, "")
      if (val.length > 0) return val
    }
  } catch { /* no .env file — password not set */ }
  return null
}

function authHeaders(password: string | null): Record<string, string> {
  if (!password) return {}
  // opencode uses HTTP Basic Auth with empty username
  return { Authorization: `Basic ${btoa(`:${password}`)}` }
}

async function ensureSlugDir(home: string, slug: string): Promise<Paths> {
  const dir = join(home, ".claude", "PAI", "MEMORY", "WORK", slug)
  await mkdir(dir, { recursive: true })
  return { eventsFile: join(dir, "opencode-messages.jsonl"), finalFile: join(dir, "opencode-final.txt") }
}

async function readPrompt(prompt: string | undefined): Promise<string> {
  if (prompt !== undefined) return prompt
  const stdin = process.stdin as typeof process.stdin & { isTTY?: boolean }
  if (stdin.isTTY) return ""
  let text = ""
  for await (const chunk of stdin) text += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8")
  return text
}

async function writeLine(stream: WriteStream, line: string): Promise<void> {
  if (stream.write(line)) return
  await new Promise<void>((resolve, reject) => { stream.once("drain", resolve); stream.once("error", reject) })
}
async function endStream(stream: WriteStream): Promise<void> {
  await new Promise<void>((resolve, reject) => { stream.once("error", reject); stream.end(resolve) })
}

async function sendNotify(url: string, body: JsonRecord): Promise<void> {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), PULSE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, voice_enabled: false }), signal: ctrl.signal })
    if (!res.ok) console.error(`InferenceOpencode: Pulse notify HTTP ${res.status}`)
  } catch (e: unknown) { console.error(`InferenceOpencode: Pulse notify failed: ${String(e)}`) }
  finally { clearTimeout(timer) }
}

function wireTimeout(state: RunState, args: Args, onTimeout: () => void): TimeoutControl {
  const timer = setTimeout(() => {
    state.timedOut = true; onTimeout()
    void sendNotify(args.pulseUrl, { message: `InferenceOpencode: timed out after ${args.timeoutMs}ms`, agent: "InferenceOpencode", slug: args.slug })
  }, args.timeoutMs)
  return { clear: () => clearTimeout(timer) }
}

function wireSignals(state: RunState, timeoutControl: TimeoutControl, onInterrupt: () => void): SignalControl {
  let handled = false
  const handler = () => { if (handled) return; handled = true; state.interrupted = true; timeoutControl.clear(); onInterrupt() }
  process.once("SIGINT", handler); process.once("SIGTERM", handler)
  return { clear: () => { process.off("SIGINT", handler); process.off("SIGTERM", handler) } }
}

// OpenCode serve HTTP API
async function createSession(serverUrl: string, workdir: string, providerID: string, modelID: string, auth: Record<string, string>): Promise<string> {
  const res = await fetch(`${serverUrl}/session?directory=${encodeURIComponent(workdir)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ providerID, modelID, title: "pai-inference", agent: "general" }),
  })
  if (!res.ok) throw new Error(`Session create failed: HTTP ${res.status}`)
  const data = asRecord(await res.json())
  if (!data || typeof data.id !== "string") throw new Error("Session create: response missing id")
  return data.id
}

async function sendPromptAsync(serverUrl: string, sessionID: string, workdir: string, text: string, auth: Record<string, string>): Promise<void> {
  const res = await fetch(`${serverUrl}/session/${sessionID}/prompt_async?directory=${encodeURIComponent(workdir)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ parts: [{ type: "text", text }] }),
  })
  if (res.status !== 204) throw new Error(`Prompt send failed: HTTP ${res.status}`)
}

async function getMessages(serverUrl: string, sessionID: string, auth: Record<string, string>): Promise<OcMessage[]> {
  try {
    const res = await fetch(`${serverUrl}/session/${sessionID}/message`, { headers: auth })
    if (!res.ok) return []
    return (await res.json()) as OcMessage[]
  } catch { return [] }
}

async function tryDeleteSession(serverUrl: string, sessionID: string, auth: Record<string, string>): Promise<void> {
  try { await fetch(`${serverUrl}/api/session/${sessionID}`, { method: "DELETE", headers: auth }) } catch { /* best-effort */ }
}

function extractResponseText(messages: OcMessage[]): string | null {
  const assistant = messages.find(m => m.info.role === "assistant" && m.info.finish === "stop")
  if (!assistant) return null
  const text = assistant.parts.filter(p => p.type === "text" && p.text).map(p => p.text!).join("")
  return text || null
}

async function runInference(args: Args, paths: Paths, prompt: string, auth: Record<string, string>): Promise<RunResult> {
  const state: RunState = { timedOut: false, interrupted: false }
  let sessionID: string | null = null
  let pollResolve: (() => void) | null = null
  let accumulated = ""

  const wakePoller = () => { if (pollResolve) { const r = pollResolve; pollResolve = null; r() } }
  const timeoutControl = wireTimeout(state, args, wakePoller)
  const signalControl = wireSignals(state, timeoutControl, wakePoller)
  const writer = createWriteStream(paths.eventsFile, { flags: "a" })

  try {
    const [providerID, modelID] = args.model.includes("/") ? args.model.split("/", 2) : ["openai", args.model]
    sessionID = await createSession(args.serverUrl, args.workdir, providerID, modelID, auth)
    await sendPromptAsync(args.serverUrl, sessionID, args.workdir, prompt, auth)

    const deadline = Date.now() + args.timeoutMs
    while (Date.now() < deadline && !state.timedOut && !state.interrupted) {
      await new Promise<void>(resolve => {
        pollResolve = resolve
        setTimeout(() => { if (pollResolve === resolve) { pollResolve = null; resolve() } }, POLL_INTERVAL_MS)
      })
      if (state.timedOut || state.interrupted) break
      const messages = await getMessages(args.serverUrl, sessionID, auth)
      await writeLine(writer, `${JSON.stringify({ ts: Date.now(), count: messages.length })}\n`)
      const text = extractResponseText(messages)
      if (text !== null) { accumulated = text; break }
    }

    if (state.timedOut) return { verdict: "timeout", accumulated, reason: `timed out after ${args.timeoutMs}ms` }
    if (state.interrupted) return { verdict: "error", accumulated, reason: "interrupted" }
    if (!accumulated) return { verdict: "error", accumulated, reason: "no response received from opencode serve" }
    return { verdict: "success", accumulated }
  } catch (error: unknown) {
    if (state.timedOut) return { verdict: "timeout", accumulated, reason: `timed out after ${args.timeoutMs}ms` }
    if (state.interrupted) return { verdict: "error", accumulated, reason: "interrupted" }
    return { verdict: "error", accumulated, reason: errorMessage(error) }
  } finally {
    timeoutControl.clear(); signalControl.clear()
    if (sessionID) await tryDeleteSession(args.serverUrl, sessionID, auth)
    await endStream(writer)
  }
}

function formatFinalLine(input: FinalInput): string {
  const base: JsonRecord = { verdict: input.verdict, exit_code: input.exitCode, events_file: input.eventsFile, final_file: input.finalFile, duration_ms: input.durationMs, final_message: input.finalMessage }
  if (input.reason !== undefined) base.reason = input.reason
  return JSON.stringify(base)
}
function emptyErrorLine(reason: string, startMs: number): string {
  return formatFinalLine({ verdict: "error", exitCode: 1, eventsFile: "", finalFile: "", durationMs: Date.now() - startMs, finalMessage: "", reason })
}

export default async function main(argv: string[]): Promise<number> {
  const startMs = Date.now()
  let paths: Paths | null = null, finalMessage = ""
  try {
    const args = parseArgs(argv), home = homeDir()
    const password = await readServerPassword(home)
    const auth = authHeaders(password)

    // Verify server is up before doing anything
    try {
      const health = await fetch(`${args.serverUrl}/api/health`, { headers: auth })
      const data = asRecord(health.ok ? await health.json() : null)
      if (!data?.healthy) { process.stdout.write(`{"verdict":"unavailable","reason":"opencode serve not healthy at ${args.serverUrl}"}\n`); return 2 }
    } catch (e: unknown) {
      process.stdout.write(`{"verdict":"unavailable","reason":"opencode serve unreachable: ${errorMessage(e)}"}\n`); return 2
    }

    paths = await ensureSlugDir(home, args.slug)
    const prompt = await readPrompt(args.prompt)
    if (!prompt.length) throw new Error("no prompt provided; pass --prompt or pipe via stdin")
    const result = await runInference(args, paths, prompt, auth)
    finalMessage = result.accumulated
    await writeFile(paths.finalFile, finalMessage, "utf8")
    const durationMs = Date.now() - startMs
    const exitCode = result.verdict === "timeout" ? null : result.verdict === "success" ? 0 : 1
    process.stdout.write(`${formatFinalLine({ verdict: result.verdict, exitCode, eventsFile: paths.eventsFile, finalFile: paths.finalFile, durationMs, finalMessage, reason: result.verdict === "success" ? undefined : result.reason })}\n`)
    return result.verdict === "success" ? 0 : 1
  } catch (error: unknown) {
    const reason = errorMessage(error)
    console.error(`InferenceOpencode: ${reason}`)
    if (paths) {
      try { await writeFile(paths.finalFile, finalMessage, "utf8") } catch { /* ignore */ }
      process.stdout.write(`${formatFinalLine({ verdict: "error", exitCode: 1, eventsFile: paths.eventsFile, finalFile: paths.finalFile, durationMs: Date.now() - startMs, finalMessage, reason })}\n`)
    } else process.stdout.write(`${emptyErrorLine(reason, startMs)}\n`)
    return 1
  }
}

if (import.meta.main) {
  const code = await main(process.argv.slice(2))
  process.exit(code)
}
