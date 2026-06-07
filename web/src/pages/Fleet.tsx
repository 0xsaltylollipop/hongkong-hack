import { useNavigate } from 'react-router-dom'
import { FlywheelCount } from '@/components/FlywheelCount'

/* ── mini arm SVGs for each node thumbnail ── */
function ArmSvg01() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <rect className="target" x="70" y="150" width="64" height="36" rx="3" />
      <rect className="block"  x="280" y="156" width="24" height="24" rx="3" />
      <polyline className="lim"   points="200,218 198,135 250,105 298,148" />
      <circle   className="joint" cx="200" cy="218" r="8" />
      <circle   className="joint" cx="198" cy="135" r="7" />
    </svg>
  )
}
function ArmSvg02() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <polyline className="lim"   points="200,218 205,135 260,115" />
      <circle   className="joint" cx="200" cy="218" r="8" />
      <rect     className="block"  x="262" y="105" width="20" height="20" rx="3" />
    </svg>
  )
}
function ArmSvg03() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <polyline className="lim"   points="180,218 220,145 300,135" />
      <circle   className="joint" cx="180" cy="218" r="8" />
    </svg>
  )
}
function ArmSvg04() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <polyline className="lim"   points="200,218 200,135 250,125" />
      <circle   className="joint" cx="200" cy="218" r="8" />
    </svg>
  )
}
function ArmSvg05() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <polyline className="lim"   points="210,218 200,135 270,155" />
      <circle   className="joint" cx="210" cy="218" r="8" />
      <rect     className="block"  x="272" y="145" width="20" height="20" rx="3" />
    </svg>
  )
}
function ArmSvg06() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <polyline className="lim"   points="190,218 210,135 280,125" />
      <circle   className="joint" cx="190" cy="218" r="8" />
    </svg>
  )
}

export default function Fleet() {
  const navigate = useNavigate()

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
            <a className="active" onClick={e => { e.preventDefault(); navigate('/fleet') }} href="/fleet">Fleet</a>
            <a onClick={e => { e.preventDefault(); navigate('/world-model') }} href="/world-model">World&nbsp;Model</a>
            <a onClick={e => { e.preventDefault(); navigate('/skills') }} href="/skills">Skills</a>
          </nav>
          <span className="spacer" />
          <div className="node-pill">
            <span className="dot" /> 1 live · 11 queued
          </div>
        </div>
      </header>

      {/* ── main view ── */}
      <main className="view">

        {/* vhead */}
        <div className="vhead">
          <div className="lhs">
            <span className="eyebrow">Fleet overview</span>
            <h1 className="vtitle">Execution fleet</h1>
          </div>
          <div className="kpis">
            <div className="kpi"><b>01</b><span>live now</span></div>
            <div className="kpi"><b style={{ color: 'var(--roadmap)' }}>12</b><span style={{ color: 'var(--roadmap)' }}>fleet · roadmap</span></div>
            <div className="kpi"><b><FlywheelCount /></b><span style={{ color: 'var(--roadmap)' }}>runs today · roadmap</span></div>
            <div className="kpi"><b>94%</b><span>avg success</span></div>
          </div>
        </div>

        {/* body: node grid + rail */}
        <div className="fleet-body">

          {/* ── node grid ── */}
          <div className="fleet-grid">

            {/* Arm-01 — live */}
            <div className="panel node" onClick={() => navigate('/dashboard')} role="link">
              <div className="cam thumb" data-cam="fleet-01">
                <div className="feed" /><div className="scan" />
                <ArmSvg01 />
                <div className="cam-label">
                  <span className="cam-rec"><span className="dot" /> REC</span>
                </div>
              </div>
              <div className="node-body">
                <div className="node-row">
                  <span className="node-name">Arm-01</span>
                  <span className="badge badge-live"><span className="dot" /> live</span>
                </div>
                <div className="node-task">▶ enter a prompt to start an agent run</div>
                <div className="node-agent"><span className="node-loc">SHENZHEN · SO-101</span></div>
                <div className="mini-bar"><i style={{ width: '94%' }} /></div>
              </div>
            </div>

            {/* Arm-02 — roadmap */}
            <div className="panel node roadmap" onClick={() => navigate('/dashboard')} role="link">
              <span className="ribbon badge badge-roadmap">roadmap</span>
              <div className="cam thumb"><div className="feed" /><ArmSvg02 /></div>
              <div className="node-body">
                <div className="node-row"><span className="node-name">Arm-02</span><span className="node-loc">HK</span></div>
                <div className="node-task">▶ sort cubes by color</div>
                <div className="node-agent"><span className="dot" /> agent: claude</div>
                <div className="mini-bar"><i style={{ width: '88%' }} /></div>
              </div>
            </div>

            {/* Arm-03 — roadmap */}
            <div className="panel node roadmap" onClick={() => navigate('/dashboard')} role="link">
              <span className="ribbon badge badge-roadmap">roadmap</span>
              <div className="cam thumb"><div className="feed" /><ArmSvg03 /></div>
              <div className="node-body">
                <div className="node-row"><span className="node-name">Arm-03</span><span className="node-loc">SHENZHEN</span></div>
                <div className="node-task">⚙ training: insert peg</div>
                <div className="node-agent"><span className="dot" /> world-model run</div>
                <div className="mini-bar"><i style={{ width: '61%' }} /></div>
              </div>
            </div>

            {/* Arm-04 — roadmap, idle */}
            <div className="panel node roadmap" onClick={() => navigate('/dashboard')} role="link">
              <span className="ribbon badge badge-roadmap">roadmap</span>
              <div className="cam thumb"><div className="feed" /><ArmSvg04 /></div>
              <div className="node-body">
                <div className="node-row"><span className="node-name">Arm-04</span><span className="node-loc">SHENZHEN</span></div>
                <div className="node-task" style={{ color: 'var(--ink-3)' }}>○ idle · available</div>
                <div className="node-agent" style={{ color: 'var(--ink-3)' }}>no agent</div>
                <div className="mini-bar"><i style={{ width: '0' }} /></div>
              </div>
            </div>

            {/* Arm-05 — roadmap */}
            <div className="panel node roadmap" onClick={() => navigate('/dashboard')} role="link">
              <span className="ribbon badge badge-roadmap">roadmap</span>
              <div className="cam thumb"><div className="feed" /><ArmSvg05 /></div>
              <div className="node-body">
                <div className="node-row"><span className="node-name">Arm-05</span><span className="node-loc">HK</span></div>
                <div className="node-task">▶ stack blocks</div>
                <div className="node-agent"><span className="dot" /> agent: claude</div>
                <div className="mini-bar"><i style={{ width: '73%' }} /></div>
              </div>
            </div>

            {/* Arm-06 — roadmap */}
            <div className="panel node roadmap" onClick={() => navigate('/dashboard')} role="link">
              <span className="ribbon badge badge-roadmap">roadmap</span>
              <div className="cam thumb"><div className="feed" /><ArmSvg06 /></div>
              <div className="node-body">
                <div className="node-row"><span className="node-name">Arm-06</span><span className="node-loc">SHENZHEN</span></div>
                <div className="node-task">⚙ world-model adaptation run</div>
                <div className="node-agent"><span className="dot" /> world-model run</div>
                <div className="mini-bar"><i style={{ width: '44%' }} /></div>
              </div>
            </div>

          </div>{/* /fleet-grid */}

          {/* ── rail: flywheel + ops health ── */}
          <div className="rail">

            {/* flywheel */}
            <div className="panel fly">
              <span className="badge badge-roadmap" style={{ position: 'absolute', top: '10px', right: '10px' }}>roadmap</span>
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <circle className="ring" cx="100" cy="100" r="80" />
                <g className="orbit">
                  <circle className="node-d" cx="100" cy="20"  r="6" />
                  <circle className="node-l" cx="176" cy="76"  r="6" />
                  <circle className="node-d" cx="147" cy="166" r="6" />
                  <circle className="node-l" cx="53"  cy="166" r="6" />
                  <circle className="node-l" cx="24"  cy="76"  r="6" />
                </g>
              </svg>
              <div className="count"><FlywheelCount /></div>
              <div className="mono" style={{ fontSize: '9px', color: 'var(--ink-3)', letterSpacing: '.06em' }}>
                executions → data → world model → deployment ↻
              </div>
            </div>

            {/* fleet ops health */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="panel-head">
                <h3>Ops health</h3>
                <span className="spacer" />
                <span className="mono">fleet reliability overview</span>
              </div>
              <div className="skills">
                <div className="skill">
                  <div className="nm">Controller uptime <span className="badge badge-live"><span className="dot" />99.94%</span></div>
                  <div className="st">last 24h across all edge nodes</div>
                  <div className="mini-bar"><i style={{ width: '99%' }} /></div>
                </div>
                <div className="skill">
                  <div className="nm">Queue saturation <span className="badge badge-live"><span className="dot" />low</span></div>
                  <div className="st">p95 wait 0.42s · 3 pending jobs</div>
                  <div className="mini-bar"><i style={{ width: '21%' }} /></div>
                </div>
                <div className="skill roadmap">
                  <div className="nm">Auto-failover <span className="badge badge-roadmap">beta</span></div>
                  <div className="st">rollout in progress for multi-site nodes</div>
                  <div className="mini-bar"><i style={{ width: '63%' }} /></div>
                </div>
              </div>
            </div>

          </div>{/* /rail */}
        </div>{/* /fleet-body */}
      </main>

    </div>
  )
}
