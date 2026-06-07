import { useNavigate } from 'react-router-dom'
import { GlyphTexture } from '@/components/GlyphTexture'
import { SplineScene } from '@/components/ui/splite'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="app">
      <GlyphTexture />

      {/* ── top bar ── */}
      <header className="topbar">
        <div className="bar">
          <div className="brand">
            <span className="brand-mark">TENDON</span>
            <span className="brand-tm">™</span>
            <span className="brand-tag">remote hardware execution lab</span>
          </div>
          <span className="spacer" />
          <button className="btn btn-fill" onClick={() => navigate('/fleet')}>Open dashboard ▸</button>
        </div>
      </header>

      {/* ── hero ── */}
      <main className="view">
        <div className="hero-grid">

          {/* left — copy */}
          <div className="hero-lhs">
            <span className="eyebrow">Built for autonomous robotics teams</span>
            <h1 className="hero-vtitle">Operate robots like software.</h1>
            <p className="muted" style={{ maxWidth: '44ch', fontSize: '15px', lineHeight: 1.65 }}>
              Deploy, monitor, and validate physical AI in one place.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn btn-fill" onClick={() => navigate('/fleet')}>Open dashboard ▸</button>
            </div>
          </div>

          {/* right — Spline scene in a cam panel */}
          <div className="hero-rhs">
            <div className="cam" style={{ height: '100%' }}>
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
