import { useNavigate } from 'react-router-dom'
import { Clock } from '@/components/Clock'

export default function Skills() {
  const navigate = useNavigate()

  return (
    <div className="app">
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
            <a className="active" onClick={e => { e.preventDefault(); navigate('/skills') }} href="/skills">Skills</a>
          </nav>
          <span className="spacer" />
          <div className="node-pill">
            <span className="dot" />
            <b>Arm-01</b>&nbsp;·&nbsp;<Clock />
          </div>
        </div>
      </header>

      <main className="view">
        <div className="vhead">
          <div className="lhs">
            <span className="eyebrow">Reusable capabilities</span>
            <h1 className="vtitle">Skill library</h1>
          </div>
          <div className="kpis">
            <div className="kpi"><b>02</b><span>live skills</span></div>
            <div className="kpi"><b style={{ color: 'var(--roadmap)' }}>02</b><span style={{ color: 'var(--roadmap)' }}>community roadmap</span></div>
            <div className="kpi"><b>460</b><span>total executions</span></div>
          </div>
        </div>

        <div className="skills-page-grid">
          <div className="panel">
            <div className="panel-head">
              <h3>Production skills</h3>
              <span className="spacer" />
              <span className="mono">validated on hardware</span>
            </div>
            <div className="skills">
              <div className="skill">
                <div className="nm">push-block <span className="badge badge-live"><span className="dot" />live</span></div>
                <div className="st">94% · 120 runs · direct control</div>
                <div className="mini-bar"><i style={{ width: '94%' }} /></div>
              </div>
              <div className="skill">
                <div className="nm">sort-cubes <span className="badge badge-live"><span className="dot" />live</span></div>
                <div className="st">88% · 340 runs · ACT policy</div>
                <div className="mini-bar"><i style={{ width: '88%' }} /></div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Community pipeline</h3>
              <span className="spacer" />
              <span className="mono">needs transfer validation</span>
            </div>
            <div className="skills">
              <div className="skill roadmap">
                <div className="nm">stack-blocks <span className="badge badge-roadmap">community</span></div>
                <div className="st">world-model adapted · shareable</div>
                <div className="mini-bar"><i style={{ width: '70%' }} /></div>
              </div>
              <div className="skill roadmap">
                <div className="nm">insert-peg <span className="badge badge-roadmap">community</span></div>
                <div className="st">re-adapt in sim if it does not transfer</div>
                <div className="mini-bar"><i style={{ width: '52%' }} /></div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Lifecycle</h3>
              <span className="spacer" />
              <span className="mono">brief → synth → train → deploy</span>
            </div>
            <div className="skills-lifecycle">
              <div className="skill-stage"><b>1</b><span>Define outcome</span></div>
              <div className="skill-stage"><b>2</b><span>Generate synthetic episodes</span></div>
              <div className="skill-stage"><b>3</b><span>Train policy in sim</span></div>
              <div className="skill-stage"><b>4</b><span>Validate on real arm</span></div>
              <button className="btn btn-fill" onClick={() => navigate('/world-model')}>
                Create new skill ▸
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
