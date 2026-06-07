import { useEffect, useRef } from 'react'

const GLYPHS = ['⊥','T','L','⌐','¬','::','—','│','▦','◦','+','/','▚','·','∟']

export function GlyphTexture() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const n = Math.min(140, Math.floor(window.innerWidth * window.innerHeight / 9500))
    let html = ''
    for (let i = 0; i < n; i++) {
      const x = (Math.random() * 100).toFixed(2)
      const y = (Math.random() * 100).toFixed(2)
      const g = GLYPHS[(Math.random() * GLYPHS.length) | 0]
      const s = (9 + Math.random() * 7).toFixed(0)
      const o = (0.03 + Math.random() * 0.06).toFixed(3)
      html += `<span style="left:${x}%;top:${y}%;font-size:${s}px;opacity:${o}">${g}</span>`
    }
    el.innerHTML = html
  }, [])

  return <div ref={ref} id="texture" />
}
