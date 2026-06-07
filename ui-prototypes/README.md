# TENDON — control plane (UI)

The console for **TENDON**, a *remote hardware execution lab*: API-first infra where AI
agents call us to **run & verify hardware**. This UI is the window into it — mission-control
for a fleet of agents operating the physical world.

No build step — static HTML/CSS/JS.

## Run
```bash
cd ui-prototypes
python3 -m http.server 8765
# open http://localhost:8765/index.html
```
Or deploy the folder to Vercel / GitHub Pages.

## Views (each locks to ONE screen, no scroll)
| File | Purpose |
|---|---|
| `index.html` | gallery / overview |
| `run-detail.html` | **live demo home** — 3 camera feeds + streaming agent log + telemetry |
| `fleet.html` | fleet of remote nodes + skill library + data flywheel (scale story) |
| `world-model.html` | the policy factory: brief → synthetic episodes → train → deploy |

`lab.css` = design system · `lab.js` = live interactions + camera wiring.

## LIVE vs ROADMAP
Honesty convention baked into the UI: **green = LIVE** (real hardware now),
**amber = ROADMAP** (vision / mocked). Keep real things real; everything else tagged roadmap.

## Camera streams (placeholders → real)
Each camera slot is `<div class="cam" data-cam="ID">`. Until wired, a stylized placeholder shows.
Wire a real feed from JS / the backend:
```js
TENDON.wireCamera('front', 'https://.../stream.m3u8')          // HLS / file / WebRTC src
TENDON.wireCameraMJPEG('front', 'http://arm-01:8080/?action=stream')  // MJPEG (e.g. mjpg-streamer)
TENDON.wireCameraStream('front', mediaStream)                  // WebRTC MediaStream
```
Camera ids in use: `front`, `side`, `wrist` (run-detail), `fleet-01` (fleet).

## Live data the backend should feed (see backend contract / Codex prompt)
The UI currently animates mock data. To make it real, the backend should expose:
- **camera streams** per arm (MJPEG or WebRTC) — wired via the calls above
- **agent activity stream** (SSE/WebSocket): `{type: think|cmd|out|ok|err, text}` → renders in `#log`
- **run state**: goal, step `n/total`, status, skill mode, run id → header
- **telemetry** (poll/WS): joint values, gripper, verify signal, success rate, latency → `.telemetry`
- **fleet list**: nodes `{id, name, location, status, task, agent, successRate, live}`
- **skills list**: `{name, successRate, runs, source, live|community}`
- **world-model job**: generated-episode thumbnails, training loss/epoch, deploy status
