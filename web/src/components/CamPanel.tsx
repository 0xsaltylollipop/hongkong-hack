import { Clock } from './Clock'

type CamSize = 'front' | 'side' | 'wrist'

interface CamPanelProps {
  camId: string
  label: string
  size?: CamSize
  streamUrl?: string
  showRec?: boolean
  showTime?: boolean
}

export function CamPanel({ camId, label, size = 'front', streamUrl, showRec = false, showTime = false }: CamPanelProps) {
  return (
    <div className={`cam ${streamUrl ? 'streaming' : ''}`} data-cam={camId}>
      <div className="feed" />
      <div className="scan" />
      {streamUrl ? (
        <img className="vid" src={streamUrl} alt={`${label} camera stream`} />
      ) : (
        <>
          {size === 'front'  && <FrontArm />}
          {size === 'side'   && <SideArm />}
          {size === 'wrist'  && <WristArm />}
        </>
      )}
      {size === 'front'  && <span className="reticle" />}
      <div className="cam-label">
        <span className="cam-tag">{label}</span>
        {showRec && (
          <span className="cam-rec">
            <span className="dot" /> REC
          </span>
        )}
      </div>
      {!streamUrl && <div className="cam-ph">live stream placeholder · cam &quot;{camId}&quot;</div>}
      {showTime && (
        <span className="cam-time">
          <Clock />
        </span>
      )}
    </div>
  )
}

function FrontArm() {
  return (
    <svg className="arm" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice">
      <rect className="target" x="170" y="250" width="120" height="64" rx="4" />
      <rect className="block"  x="560" y="262" width="44"  height="44"  rx="4" />
      <rect x="350" y="334" width="120" height="20" rx="4" fill="#2a2f37" />
      <polyline className="lim"   points="410,334 408,236 500,168" />
      <polyline className="lim"   points="500,168 588,252" />
      <circle   className="joint" cx="410" cy="334" r="12" />
      <circle   className="joint" cx="408" cy="236" r="10" />
      <circle   className="joint" cx="500" cy="168" r="9"  />
      <polyline className="grip"  points="588,252 610,240" />
      <polyline className="grip"  points="588,252 610,266" />
    </svg>
  )
}

function SideArm() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <polyline className="lim"   points="120,215 200,140 280,158" />
      <circle   className="joint" cx="120" cy="215" r="8" />
      <circle   className="joint" cx="200" cy="140" r="7" />
      <rect     className="block"  x="284" y="148" width="24" height="24" rx="3" />
    </svg>
  )
}

function WristArm() {
  return (
    <svg className="arm" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
      <circle   className="target" cx="200" cy="120" r="44" />
      <rect     className="block"  x="187" y="107" width="26" height="26" rx="3" />
      <polyline className="grip"   points="162,120 187,120" />
      <polyline className="grip"   points="238,120 213,120" />
    </svg>
  )
}
