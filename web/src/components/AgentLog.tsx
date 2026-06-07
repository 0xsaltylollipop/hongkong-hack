import { useState, useEffect, useRef } from 'react'

type Kind = 'think' | 'cmd' | 'out' | 'ok' | 'err'

interface Entry {
  id: number
  kind: Kind
  html: string
}

const SCRIPT: [Kind, string][] = [
  ['think', 'goal received: <b>task prompt accepted</b>'],
  ['cmd',   'hwexec observe --cameras front,wrist'],
  ['out',   '→ joints[0.02,−1.11,1.34,0.08,−0.55] · block@(0.41,0.18) · zone@(0.22,0.20)'],
  ['think', 'block is right of the target. plan: approach from the right face, push left along x.'],
  ['cmd',   'hwexec move --pose approach --speed 0.3'],
  ['out',   '→ moving … contact in 3 waypoints'],
  ['ok',    '✓ reached approach pose · gripper closed'],
  ['cmd',   'hwexec move --delta x=−0.19 --speed 0.25'],
  ['out',   '→ pushing … block displacement 0.17m'],
  ['cmd',   'hwexec observe --verify zone=left'],
  ['out',   '→ block@(0.23,0.20) · inside zone bounds'],
  ['ok',    '✓ verified from camera · run complete (7/7)'],
  ['think', 'logging trajectory → execution feeds the data flywheel.'],
]

function buildInner(kind: Kind, html: string): string {
  switch (kind) {
    case 'think': return `<span class="think"><span class="k">think</span> ${html}</span>`
    case 'cmd':   return `<span class="cmd"><span class="p">$</span> ${html}</span>`
    case 'out':   return `<span class="out">${html}</span>`
    case 'ok':    return `<span class="ok">${html}</span>`
    case 'err':   return `<span class="err">${html}</span>`
  }
}

export function AgentLog() {
  const [entries, setEntries] = useState<Entry[]>([])
  const logRef    = useRef<HTMLDivElement>(null)
  const uidRef    = useRef(0)
  const scriptIdx = useRef(0)

  useEffect(() => {
    const seed: Entry[] = []
    for (let i = 0; i < 7; i++) {
      const [kind, html] = SCRIPT[i % SCRIPT.length]
      seed.push({ id: uidRef.current++, kind, html })
    }
    scriptIdx.current = 7 % SCRIPT.length
    setEntries(seed)

    const timer = setInterval(() => {
      const [kind, html] = SCRIPT[scriptIdx.current]
      scriptIdx.current = (scriptIdx.current + 1) % SCRIPT.length
      setEntries(prev => {
        const next = [...prev, { id: uidRef.current++, kind, html }]
        return next.length > 40 ? next.slice(-40) : next
      })
    }, 1500)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries])

  return (
    <div className="log" ref={logRef}>
      {entries.map((e, i) => (
        <div
          key={e.id}
          className="ln"
          dangerouslySetInnerHTML={{
            __html: `<span class="gut">${String(i + 1).padStart(2, '0')}</span>${buildInner(e.kind, e.html)}`,
          }}
        />
      ))}
    </div>
  )
}
