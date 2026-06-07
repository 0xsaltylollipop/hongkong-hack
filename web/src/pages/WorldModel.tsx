import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from '@/components/Clock'

/* ── synthetic episode grid ── */
const ARM_PATHS = [
  'M30,72 L34,44 L60,38',
  'M30,72 L30,42 L58,50',
  'M28,72 L40,46 L64,42',
  'M32,72 L28,44 L56,54',
]

function EpGrid() {
  return (
    <div className="ep-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="ep" style={{ animationDelay: `${(i * 0.12).toFixed(2)}s` }}>
          <div className="feed" />
          <svg viewBox="0 0 80 78" preserveAspectRatio="xMidYMid slice">
            <polyline
              points={ARM_PATHS[i % ARM_PATHS.length]}
              fill="none"
              stroke="#6b7480"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect x="58" y="40" width="9" height="9" rx="2" fill="#c8462f" />
          </svg>
          <span className="syn">SYN</span>
        </div>
      ))}
    </div>
  )
}

export default function WorldModel() {
  const navigate = useNavigate()
  const [brief, setBrief] = useState('stack two blocks into a tower')

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
            <a onClick={e => { e.preventDefault(); navigate('/fleet') }}        href="/fleet">Fleet</a>
            <a className="active"
               onClick={e => { e.preventDefault(); navigate('/world-model') }} href="/world-model">World&nbsp;Model</a>
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
          <div className="lhs">
            <span className="eyebrow">World model pipeline</span>
            <h1 className="vtitle">Teach a new skill in&nbsp;minutes</h1>
          </div>
          <div className="kpis">
            <div className="kpi"><b>~4<small> min</small></b><span>sim → deployable</span></div>
            <div className="kpi"><b>0</b><span>real demos needed</span></div>
          </div>
        </div>

        {/* skill brief */}
        <div className="panel brief">
          <span className="lab">Skill brief</span>
          <input
            value={brief}
            onChange={e => setBrief(e.target.value)}
            spellCheck={false}
          />
          <span className="badge badge-syn">synthetic</span>
          <button className="btn btn-fill">Generate ▸</button>
        </div>

        {/* pipeline */}
        <div className="pipeline">

          {/* 01 — generate */}
          <div className="stage">
            <div className="num">01</div>
            <h4>Generate synthetic episodes</h4>
            <p>The world model dreams thousands of rollouts — no teleop, no real demos.</p>
            <EpGrid />
            <div className="arrow">▸</div>
          </div>

          {/* 02 — train */}
          <div className="stage">
            <div className="num">02</div>
            <h4>Train policy in sim</h4>
            <p>Fit on the synthetic set. The fast inner loop — minutes, not weeks.</p>
            <div className="lossbox">
              <div className="mono" style={{ fontSize: '9px', color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between' }}>
                <span>training loss</span><span>0.041 ↓</span>
              </div>
              <svg className="loss-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
                <line className="grid-line" x1="0" y1="27" x2="300" y2="27" />
                <line className="grid-line" x1="0" y1="54" x2="300" y2="54" />
                <path className="curve" d="M5 12 C 55 58, 95 70, 150 73 S 250 76, 296 75" />
                <circle className="loss-dot" cx="296" cy="75" r="3.5" />
              </svg>
              <div className="progress"><i /></div>
              <div className="mono" style={{ fontSize: '9px', color: 'var(--ink-3)', marginTop: '7px' }}>epoch 38 / 40</div>
            </div>
            <div className="arrow">▸</div>
          </div>

          {/* 03 — deploy */}
          <div className="stage">
            <div className="num">03</div>
            <h4>Deploy → real arm</h4>
            <p>Validate on metal through the execution environment. The outer loop — ground truth.</p>
            <div className="deploy">
              <div className="skill-out">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>stack-blocks</div>
                  <div className="mono" style={{ fontSize: '9px', color: 'var(--ink-3)' }}>trained on 2,048 synthetic eps</div>
                </div>
                <span className="badge badge-live"><span className="dot" /> ready</span>
              </div>
              <button className="btn btn-fill" style={{ justifyContent: 'center' }}
                onClick={() => navigate('/dashboard')}>
                ▶ Run on Arm-01 · Shenzhen
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
                Save to skill library
              </button>
            </div>
          </div>

        </div>{/* /pipeline */}

        {/* loop note */}
        <div className="loopnote">
          <span><b>World model</b> = the speed (synthetic, instant)</span>
          <span>→</span>
          <span><b>Execution environment</b> = the truth (real hardware)</span>
          <span>→</span>
          <span><b>Together</b> = physical iteration at software speed</span>
        </div>

      </main>
    </div>
  )
}
