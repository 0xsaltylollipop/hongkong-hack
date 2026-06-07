# Hong Kong Hack: hardware execution environment

`hwexec` is a small SDK and CLI execution environment for AI agents operating
LeRobot SO101 hardware. It gives Claude Code one reliable interface for:

- observing arm joints and camera frames
- moving to safe joint targets or named poses
- opening and closing the gripper
- running a trained ACT policy through LeRobot
- inspecting a LeRobot dataset

This is hackathon step 1 only. World models, simulation training, IK, web UI,
multi-arm orchestration, and production hardening are intentionally out of
scope.

## What is included

```bash
hwexec --mock observe --image observations/latest.ppm
hwexec --mock move --pose home
hwexec --mock move --joints 0 0 0 0 0 50
hwexec --mock gripper open
hwexec --mock run-policy --steps 20
hwexec --mock dataset inspect
hwexec-agent --mock "run the sorting policy"
hwexec serve --mock
```

The package is importable too:

```python
from pathlib import Path

from hwexec import HWExecController, load_config

cfg = load_config("config.yaml")
arm = HWExecController(cfg, mock=True)
arm.observe(Path("observations/latest.ppm"))
arm.move(pose="home", dry_run=True)
```

Every command logs JSON records to stdout so humans and agents can read the same
action trail.

## Setup on the hardware laptop

1. Install Python 3.10+ and Node.js 18+.
2. Install Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
```

3. Install LeRobot from the teammate's checked-out LeRobot repo with Feetech
   support. The current official SO101 docs say the `main` docs require source
   install; latest stable shown there is `v0.5.1`.

```bash
cd /path/to/lerobot
pip install -e ".[feetech]"
```

4. Install this repo:

```bash
cd /path/to/hongkong-hack
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

5. Copy and edit config only:

```bash
cp config.example.yaml config.yaml
cp .env.example .env
```

Fill in:

- SO101 follower serial port
- ACT policy checkpoint path or Hugging Face repo ID
- dataset repo ID or local path
- camera indices
- `ANTHROPIC_API_KEY`

The default example config is already wired to the teammate policy:

- policy: `adrrrobo/sorting_ACT`
- dataset: `adrrrobo/Hackathon2_20260606_210708`

Replace those only if the hardware laptop should use a local checkpoint or local
dataset path instead.

Do not edit code for normal hardware setup.

## Agent usage

`hwexec-agent` uses the Claude Agent SDK programmatically. Claude Code remains
the loop; this repo does not hand-build a custom planner.

```bash
export ANTHROPIC_API_KEY=...
hwexec-agent --mock "observe the scene, move home, and verify"
```

For real hardware, start conservatively:

```bash
hwexec-agent --dry-run "push the red block left"
```

Then remove `--dry-run` only after the observed command sequence looks safe.

The runner system prompt tells Claude:

- it controls a real SO101 arm via `hwexec`
- observe before and after acting
- move slowly
- stay within configured limits
- stop on clamp, hardware error, or unexpected observation

## Control-plane web API

`hwexec serve` exposes the static TENDON UI and the three live API endpoints the
prototype already calls. It serves everything from one origin, so the browser
does not need CORS.

```bash
hwexec serve --mock
# open http://localhost:8765/dashboard
```

Endpoints:

- `POST /api/run` with `{ "goal": "push the red block into the left zone" }`
  starts a run and returns `{ "runId": "..." }`.
- `GET /api/events` streams default Server-Sent Events. Each `data:` payload is
  one JSON object with `kind: "log"`, `kind: "run"`, or `kind: "telemetry"`.
- `GET /api/cameras` returns MJPEG URLs for `front`, `side`, and `wrist`; in
  `--mock` it returns `{}` so UI placeholders stay visible.

Mock mode requires no robot, cameras, policy files, or `ANTHROPIC_API_KEY`.
Pressing **Run agent** streams a believable observe → move → run-policy → verify
sequence into the UI log.

The served UI is the React app in `web/`. Build it before running the Python
server:

```bash
npm --prefix web install
npm --prefix web run build
hwexec serve --mock
```

Real mode:

```bash
export ANTHROPIC_API_KEY=...
hwexec serve
```

In real mode the server launches the Claude Agent SDK with the configured model
and effort. Claude operates through `hwexec` from this repo, with a system prompt
that says it can use the SO-101 arms to test physical prototypes, manipulate
objects, run the ACT policy, gather observations, and verify outcomes. Camera
streams use OpenCV if it is installed on the hardware laptop; install with
`pip install -e ".[camera]"` if needed.

For frontend development, run the React dev server separately; it proxies
`/api/*` and `/cam/*` to `hwexec serve`:

```bash
hwexec serve --mock
npm --prefix web run dev
```

Config defaults target:

- model: `claude-opus-4-8`
- effort: `xhigh`

Official Anthropic docs say `claude-opus-4-8` is the current Opus 4.8 API ID and
Claude Code supports `--effort` values `low`, `medium`, `high`, `xhigh`, and
`max`. `xhigh` is the requested long-horizon agentic setting; `max` is also a
valid maximum-capability setting but costs more and is not the same value.

## Command reference

### `observe`

Reads joint positions and one camera frame. Saves the frame to the requested
path and prints joint JSON.

```bash
hwexec --mock observe --image observations/mock.ppm
hwexec observe --dry-run --image observations/dry.ppm
hwexec observe --image observations/real.ppm
```

### `move`

Moves to a named pose or explicit joint targets. All targets are clamped to
configured joint limits and interpolated slowly.

```bash
hwexec --mock move --pose home
hwexec --mock move --joints 0 0 0 0 0 50
hwexec move --dry-run --pose rest
```

### `gripper`

Uses configured gripper open/closed positions.

```bash
hwexec --mock gripper open
hwexec --mock gripper close
```

### `run-policy`

Runs the configured ACT policy through official LeRobot policy deployment:
`lerobot-rollout --strategy.type=base ...`.

```bash
hwexec run-policy --dry-run --steps 30
hwexec run-policy --duration 60
```

### `dataset inspect`

Summarizes a configured LeRobot dataset: episodes, frames, fields, and fps when
available.

```bash
hwexec --mock dataset inspect
hwexec dataset inspect
```

## Tonight smoke tests without hardware

```bash
python -c "import hwexec; print(hwexec.__all__)"
hwexec --help
hwexec observe --help
hwexec move --help
hwexec gripper --help
hwexec run-policy --help
hwexec dataset inspect --help
hwexec --dry-run observe --image observations/dry.ppm
hwexec --mock observe --image observations/mock.ppm
hwexec --mock move --pose home
hwexec --mock gripper open
hwexec --mock run-policy --steps 3
hwexec --mock dataset inspect
hwexec-agent --mock "observe, move home, observe again"
hwexec serve --mock
```

If `ANTHROPIC_API_KEY` is missing, the last command exits with a clear message.
That is expected tonight unless the key has been provided.

## TOMORROW: hardware test checklist

Run these in order on the real arm.

1. Observe returns real joint values and saves a real image:

```bash
hwexec observe --image observations/real.ppm
```

2. Move goes to commanded joints, then back to home, safely:

```bash
hwexec move --dry-run --pose home
hwexec move --pose home
hwexec move --dry-run --joints 0 0 0 0 0 50
hwexec move --joints 0 0 0 0 0 50
hwexec move --pose home
```

3. Gripper opens and closes:

```bash
hwexec gripper --dry-run open
hwexec gripper open
hwexec gripper close
```

4. ACT policy runs on the real arm:

```bash
hwexec run-policy --dry-run --steps 30
hwexec run-policy --steps 30
```

5. Agent runner uses `hwexec` end to end:

```bash
hwexec-agent --dry-run "push the block"
hwexec-agent "push the block"
```

6. Dataset inspect prints a real summary:

```bash
hwexec dataset inspect
```

7. Control-plane UI drives the same endpoints:

```bash
hwexec serve --mock
# open http://localhost:8765/dashboard and press Run agent
hwexec serve
# repeat after cameras, arm calibration, and ANTHROPIC_API_KEY are ready
```

## Assumptions and version notes

- LeRobot target: official Hugging Face LeRobot `main` docs as checked on
  2026-06-07, with stable version link `v0.5.1`.
- SO101 setup target: `so101_follower` robot type and Feetech extras.
- Policy deployment target: `lerobot-rollout` with `--strategy.type=base`,
  `--policy.path`, `--robot.type`, `--robot.port`, `--robot.cameras`,
  `--duration`, `--fps`, and `--task`.
- Integrated teammate ACT policy: `adrrrobo/sorting_ACT`.
- Integrated dataset repo from that model card:
  `adrrrobo/Hackathon2_20260606_210708`.
- Direct observe/move target: documented import path
  `lerobot.robots.so_follower.SO101FollowerConfig` / `SO101Follower`, with a
  fallback to `lerobot.robots.so101_follower` for installs that expose that
  module. The robot object must expose
  `connect()`, `get_observation()`, `send_action()`, and `disconnect()`.
  If the teammate's LeRobot checkout has renamed constructor fields, adjust only
  `hwexec/backends.py`.
- Anthropic target: Claude Agent SDK import path `claude_agent_sdk`, model
  `claude-opus-4-8`, effort `xhigh`.
- The configured joint limits are conservative placeholders. Tighten them after
  the first real observation/calibration on the hardware laptop.

## Safety notes

`hwexec` clamps targets, moves in small steps, sleeps between steps, logs all
actions, supports `--dry-run`, and disconnects on interrupt where possible.
It cannot replace a human watching the robot during the first hardware run.
