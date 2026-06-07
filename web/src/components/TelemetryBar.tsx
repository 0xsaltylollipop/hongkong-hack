import { useState, useEffect } from 'react'

export function TelemetryBar() {
  const [sparks,  setSparks]  = useState<number[]>(Array(10).fill(40))
  const [latency, setLatency] = useState(38)
  const [rate,    setRate]    = useState(94.0)

  useEffect(() => {
    const id = setInterval(() => {
      setSparks(() => Array(10).fill(0).map(() => 20 + Math.random() * 78))
      setLatency(Math.floor(34 + Math.random() * 16))
      setRate(+(92 + Math.random() * 5).toFixed(1))
    }, 900)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="telemetry">
      <div className="metric">
        <div className="lab">Joint torque · J1–J5</div>
        <div className="spark">
          {sparks.map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="metric">
        <div className="lab">Gripper</div>
        <div className="val">closed <small>· 31N</small></div>
      </div>
      <div className="metric ok">
        <div className="lab">Verify signal</div>
        <div className="val">✓ on&nbsp;track</div>
      </div>
      <div className="metric">
        <div className="lab">Skill success rate</div>
        <div className="val">{rate}<small>%</small></div>
      </div>
      <div className="metric">
        <div className="lab">Round-trip latency</div>
        <div className="val">{latency}<small>ms · SZ↔edge</small></div>
      </div>
    </div>
  )
}
