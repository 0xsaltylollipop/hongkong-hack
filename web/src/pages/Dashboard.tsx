import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from '@/components/Clock'
import { CamPanel } from '@/components/CamPanel'
import { TelemetryBar } from '@/components/TelemetryBar'

type LogKind = 'think' | 'cmd' | 'out' | 'ok' | 'err'
type RunStatus = 'draft' | 'running' | 'complete'
interface LogEntry { id: number; kind: LogKind; text: string }
interface RunEvent { kind: 'run'; step?: number; total?: number; status?: RunStatus }
interface LogEvent { kind: 'log'; type?: LogKind; text?: string }
interface TelemetryEvent { kind: 'telemetry'; joints?: number[]; gripper?: string; successRate?: number; latencyMs?: number }
type StreamEvent = RunEvent | LogEvent | TelemetryEvent
type CameraMap = Partial<Record<'front' | 'side' | 'wrist', string>>

const TOTAL_STEPS = 7

export default function Dashboard() {
  const navigate = useNavigate()
  const [goal, setGoal] = useState('push the red block into the left zone')
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<RunStatus>('draft')
  const [stepsDone, setStepsDone] = useState(0)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [cameras, setCameras] = useState<CameraMap>({})
  const nextId = useRef(1)
  const timerRef = useRef<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadCameras()
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries])

  function statusColor(s: RunStatus) {
    if (s === 'running') return 'var(--live)'
    if (s === 'complete') return 'var(--ink)'
    return 'var(--roadmap)'
  }

  function addLog(kind: LogKind, text: string) {
    setEntries(prev => {
      const next = [...prev, { id: nextId.current++, kind, text }]
      return next.length > 60 ? next.slice(-60) : next
    })
  }

  async function loadCameras() {
    try {
      const res = await fetch('/api/cameras')
      if (!res.ok) return
      setCameras(await res.json())
    } catch {
      setCameras({})
    }
  }

  function toHtml(kind: LogKind, text: string) {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    if (kind === 'think') return `<span class="think"><span class="k">think</span> ${escaped}</span>`
    if (kind === 'cmd') return `<span class="cmd"><span class="p">$</span> ${escaped}</span>`
    if (kind === 'ok') return `<span class="ok">${escaped}</span>`
    if (kind === 'err') return `<span class="err">${escaped}</span>`
    return `<span class="out">${escaped}</span>`
  }

  function runMock(goalText: string) {
    const script: [LogKind, string][] = [
      ['think', `goal received: ${goalText}`],
      ['cmd', 'hwexec observe --cameras front,side,wrist'],
      ['out', '→ joints[0.02,-1.11,1.34,0.08,-0.55] · block@(0.41,0.18) · zone@(0.22,0.20)'],
      ['think', 'I can do this with direct control. plan: approach from the right, push left along x.'],
      ['cmd', 'hwexec move --pose approach --speed 0.3'],
      ['ok', '✓ reached approach pose · gripper closed'],
      ['cmd', 'hwexec move --delta x=-0.19 --speed 0.25'],
      ['out', '→ pushing … block displacement 0.17m'],
      ['think', 'target needs a learned skill next — invoking the trained ACT policy.'],
      ['cmd', 'hwexec run-policy sort'],
      ['out', '→ ACT policy executing on real arm …'],
      ['cmd', 'hwexec observe --verify'],
      ['ok', '✓ verified from camera · task complete'],
    ]
    let i = 0
    const tick = () => {
      if (i >= script.length) {
        setRunning(false)
        setStatus('complete')
        setStepsDone(TOTAL_STEPS)
        timerRef.current = null
        return
      }
      const [kind, text] = script[i++]
      addLog(kind, text)
      if (kind === 'cmd' || kind === 'ok') {
        setStepsDone(prev => Math.min(TOTAL_STEPS, prev + 1))
      }
      timerRef.current = window.setTimeout(tick, 850 + Math.random() * 650)
    }
    tick()
  }

  async function runBackend(goalText: string) {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: goalText }),
    })
    if (!res.ok) throw new Error(`backend returned ${res.status}`)
    await res.json()

    eventSourceRef.current?.close()
    eventSourceRef.current = new EventSource('/api/events')
    eventSourceRef.current.onmessage = event => {
      const data = JSON.parse(event.data) as StreamEvent
      if (data.kind === 'log') {
        addLog(data.type || 'out', data.text || '')
        return
      }
      if (data.kind === 'run') {
        setStepsDone(Math.min(data.total || TOTAL_STEPS, data.step || 0))
        if (data.status) setStatus(data.status)
        if (data.status === 'complete') {
          setRunning(false)
          eventSourceRef.current?.close()
          eventSourceRef.current = null
        }
      }
    }
    eventSourceRef.current.onerror = () => {
      addLog('err', 'lost backend event stream')
      setRunning(false)
      setStatus('complete')
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }

  async function onRun() {
    if (running) return
    const goalText = goal.trim() || 'run the demo'
    setRunning(true)
    setStatus('running')
    setStepsDone(0)
    setEntries([])
    try {
      await runBackend(goalText)
    } catch (error) {
      addLog('err', `backend unavailable; falling back to browser mock (${error instanceof Error ? error.message : 'unknown error'})`)
      runMock(goalText)
    }
  }

  return (
    <div className="app">
      {/* ── top bar ── */}
      <header className="topbar">
        <div className="bar">
          <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <span className="brand-mark">TENDON</span>
            <span className="brand-tm">™</span>
            <span className="brand-tag">remote hardware execution lab</span>
          </div>
          <nav className="nav">
            <a onClick={e => { e.preventDefault(); navigate('/fleet') }} href="/fleet">Fleet</a>
            <a onClick={e => { e.preventDefault(); navigate('/world-model') }} href="/world-model">World&nbsp;Model</a>
            <a onClick={e => { e.preventDefault(); navigate('/skills') }} href="/skills">Skills</a>
          </nav>
          <span className="spacer" />
          <div className="node-pill">
            <span className="dot" />
            <b>Arm-01</b>&nbsp;·&nbsp;<Clock />
          </div>
        </div>
      </header>

      {/* ── main view ── */}
      <main className="view">

        {/* vhead */}
        <div className="vhead">
          <div className="run-title" style={{ flex: 1, minWidth: 0 }}>
            <span className="eyebrow">Mission · the agent runs hands-off</span>
            <div className="goalbar">
              <span className="goal-tag">Goal</span>
              <input
                className="goal-input"
                spellCheck={false}
                value={goal}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void onRun()
                  }
                }}
                onChange={e => {
                  setGoal(e.target.value)
                  if (!running) setStatus('draft')
                }}
              />
            </div>
          </div>

          <div className="run-side">
            <button className={`run-btn ${running ? 'running' : ''}`} onClick={onRun} disabled={running}>
              <span className="tri" />
              <span className="spin" />
              <span className="lbl">{running ? 'Running…' : stepsDone >= TOTAL_STEPS ? 'Run again' : 'Run agent'}</span>
            </button>
            <div className="run-meta">
              <div><span>Agent</span><b>claude-opus-4.8</b></div>
              <div><span>Mode</span><b>autonomous</b></div>
              <div><span>Status</span><b style={{ color: statusColor(status) }}>{status}</b></div>
            </div>
          </div>
        </div>

        {/* camera stack + agent log */}
        <div className="detail-grid">

          <div className="cam-stack">
            <CamPanel camId="front" label="FRONT · 1080p" size="front" streamUrl={cameras.front} showRec showTime />
            <div className="cam-thumbs">
              <CamPanel camId="side"  label="SIDE"             size="side"  streamUrl={cameras.side} />
              <CamPanel camId="wrist" label="WRIST · top-down" size="wrist" streamUrl={cameras.wrist} />
            </div>
          </div>

          <div className="panel log-panel">
            <div className="panel-head">
              <span className="badge badge-live"><span className="dot" /> live</span>
              <h3>Agent activity</h3>
              <span className="spacer" />
              <span className="mono">reasoning + hwexec calls</span>
            </div>
            <div className="log" ref={logRef}>
              {entries.length === 0 ? (
                <div className="log-hint">▶ Press “Run agent” — it operates the arm hands-off from here.</div>
              ) : (
                entries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="ln"
                    dangerouslySetInnerHTML={{
                      __html: `<span class="gut">${String(i + 1).padStart(2, '0')}</span>${toHtml(entry.kind, entry.text)}`,
                    }}
                  />
                ))
              )}
            </div>
          </div>

        </div>

        {/* telemetry */}
        <TelemetryBar />

      </main>
    </div>
  )
}
