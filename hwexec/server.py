from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from hwexec.agent_runner import COMMAND_REFERENCE
from hwexec.config import HWExecConfig

LOG_TOTAL_STEPS = 7
SSE_HEADERS = {
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
}


@dataclass
class EventBus:
    history: list[dict[str, Any]] = field(default_factory=list)
    subscribers: set[asyncio.Queue[dict[str, Any]]] = field(default_factory=set)
    run_id: str | None = None

    async def reset(self, run_id: str) -> None:
        self.run_id = run_id
        self.history.clear()
        await self.publish({"kind": "run", "step": 0, "total": LOG_TOTAL_STEPS, "status": "running"})

    async def publish(self, event: dict[str, Any]) -> None:
        self.history.append(event)
        self.history[:] = self.history[-300:]
        for queue in list(self.subscribers):
            await queue.put(event)

    async def subscribe(self) -> AsyncIterator[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        for event in self.history:
            await queue.put(event)
        self.subscribers.add(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self.subscribers.discard(queue)


def create_app(config: HWExecConfig, mock: bool = False) -> FastAPI:
    load_dotenv()
    app = FastAPI(title="hwexec control-plane API")
    app.state.config = config
    app.state.mock = mock
    app.state.bus = EventBus()
    app.state.active_task = None

    @app.post("/api/run")
    async def api_run(payload: dict[str, Any]) -> JSONResponse:
        goal = str(payload.get("goal") or "").strip()
        if not goal:
            raise HTTPException(status_code=400, detail="Request JSON must include non-empty `goal`.")

        run_id = uuid.uuid4().hex[:12]
        await app.state.bus.reset(run_id)
        task = asyncio.create_task(_run_goal(app.state.bus, config, goal, run_id, mock))
        app.state.active_task = task
        return JSONResponse({"runId": run_id})

    @app.get("/api/events")
    async def api_events(request: Request) -> StreamingResponse:
        async def stream() -> AsyncIterator[str]:
            async for event in app.state.bus.subscribe():
                if await request.is_disconnected():
                    break
                yield _sse(event)
                await asyncio.sleep(0)

        return StreamingResponse(stream(), media_type="text/event-stream", headers=SSE_HEADERS)

    @app.get("/api/cameras")
    async def api_cameras(request: Request) -> dict[str, str]:
        if mock:
            return {}
        base = str(request.base_url).rstrip("/")
        return {name: f"{base}/cam/{name}" for name in _camera_roles(config)}

    @app.get("/cam/{camera_id}")
    async def cam_stream(camera_id: str) -> StreamingResponse:
        roles = _camera_roles(config)
        if camera_id not in roles:
            raise HTTPException(status_code=404, detail=f"Unknown camera `{camera_id}`.")
        return StreamingResponse(
            _mjpeg_stream(roles[camera_id], config),
            media_type="multipart/x-mixed-replace; boundary=frame",
            headers=SSE_HEADERS,
        )

    ui_dir = Path(config.server.ui_dir)
    if not ui_dir.exists():
        raise RuntimeError(
            f"UI directory not found: {ui_dir}. "
            "For the React UI, run `npm --prefix web install` and `npm --prefix web run build` first."
        )
    _mount_ui(app, ui_dir)
    return app


def serve(config: HWExecConfig, mock: bool = False, host: str | None = None, port: int | None = None) -> None:
    import uvicorn

    bind_host = host or os.environ.get("HWEXEC_HOST") or config.server.host
    bind_port = port or int(os.environ.get("HWEXEC_PORT") or config.server.port)
    uvicorn.run(create_app(config, mock=mock), host=bind_host, port=bind_port)


def _mount_ui(app: FastAPI, ui_dir: Path) -> None:
    assets_dir = ui_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}")
    async def spa(path: str) -> FileResponse:
        requested = (ui_dir / path).resolve()
        root = ui_dir.resolve()
        if requested.is_file() and requested.is_relative_to(root):
            return FileResponse(requested)

        index = ui_dir / "index.html"
        if index.exists():
            return FileResponse(index)

        raise HTTPException(status_code=404, detail=f"Static UI file not found: {path}")


async def _run_goal(bus: EventBus, config: HWExecConfig, goal: str, run_id: str, mock: bool) -> None:
    try:
        if mock:
            await _mock_run(bus, goal)
        else:
            await _real_agent_run(bus, config, goal)
    except Exception as exc:
        await _log(bus, "err", f"{type(exc).__name__}: {exc}")
    finally:
        await bus.publish({"kind": "run", "step": LOG_TOTAL_STEPS, "total": LOG_TOTAL_STEPS, "status": "complete"})


async def _mock_run(bus: EventBus, goal: str) -> None:
    script = [
        ("think", f"goal received: {goal}"),
        ("cmd", "hwexec --mock observe --image observations/server-front.ppm"),
        ("out", "joints=[0.00, 0.02, -0.04, 0.01, 0.00] camera=front block=visible"),
        ("think", "plan: observe, make two small guarded pushes, then use ACT sorting policy."),
        ("cmd", "hwexec --mock move --joints 8 -12 18 4 0 50"),
        ("ok", "reached approach pose slowly"),
        ("cmd", "hwexec --mock move --joints 14 -10 16 4 0 50"),
        ("out", "block displaced left; gripper remains closed"),
        ("cmd", "hwexec --mock move --pose home"),
        ("ok", "returned to home corridor"),
        ("think", "direct push is stable; invoking learned ACT sorting skill."),
        ("cmd", "hwexec --mock run-policy --steps 30"),
        ("out", "ACT policy adrrrobo/sorting_ACT executed 30 mock steps"),
        ("cmd", "hwexec --mock observe --image observations/server-verify.ppm"),
        ("ok", "verified from camera: task complete"),
    ]
    step = 0
    for event_type, text in script:
        await _log(bus, event_type, text)
        if event_type in {"cmd", "ok"}:
            step = min(LOG_TOTAL_STEPS - 1, step + 1)
            await bus.publish({"kind": "run", "step": step, "total": LOG_TOTAL_STEPS, "status": "running"})
            await _telemetry(bus, step)
        await asyncio.sleep(0.45)


async def _real_agent_run(bus: EventBus, config: HWExecConfig, goal: str) -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        await _log(bus, "err", "ANTHROPIC_API_KEY is not set. Start with `hwexec serve --mock` or fill .env.")
        return

    try:
        from claude_agent_sdk import ClaudeAgentOptions, query
    except Exception as exc:
        await _log(bus, "err", f"claude-agent-sdk is not importable: {exc}")
        return

    await _log(bus, "think", f"goal received: {goal}")
    prompt = f"""
Objective: {goal}

You are running hands-off from the control-plane UI.
Operate through the hwexec CLI from this repository.
Use observe -> act -> verify. Move slowly. Stay inside configured limits.
You may use direct control (`hwexec observe`, `hwexec move`, `hwexec gripper`) and/or the trained ACT sorting policy (`hwexec run-policy`).
Narrate concisely.
"""

    options = ClaudeAgentOptions(
        cwd=Path.cwd(),
        model=config.agent.model,
        effort=config.agent.effort,
        max_turns=config.agent.max_turns,
        system_prompt=_server_system_prompt(),
        allowed_tools=config.agent.allowed_tools,
        permission_mode=config.agent.permission_mode,
    )
    step = 0
    async for message in query(prompt=prompt, options=options):
        for event_type, text in _map_agent_message(message):
            await _log(bus, event_type, text)
            if event_type in {"cmd", "ok"}:
                step = min(LOG_TOTAL_STEPS - 1, step + 1)
                await bus.publish({"kind": "run", "step": step, "total": LOG_TOTAL_STEPS, "status": "running"})
                await _telemetry(bus, step)


def _server_system_prompt() -> str:
    return f"""
You control a REAL SO-101 arm via the hwexec CLI.

Hands-off operating rules:
- Observe before acting and observe again after acting.
- Move slowly and conservatively. Prefer named poses and dry-runs before unfamiliar motion.
- Stay within configured joint limits. Stop if hwexec reports clamping, hardware errors, or unexpected observations.
- Use the ACT sorting policy when the goal calls for sorting or when direct control should hand off to the learned skill.
- You may use the arms to test physical prototypes, manipulate objects, run repeatable checks, gather observations, and verify outcomes.
- Keep narration concise for a live control-plane log.

{COMMAND_REFERENCE}
"""


def _map_agent_message(message: Any) -> list[tuple[str, str]]:
    events: list[tuple[str, str]] = []
    content = getattr(message, "content", None)
    if isinstance(content, list):
        for block in content:
            block_type = getattr(block, "type", None)
            text = getattr(block, "text", None)
            name = getattr(block, "name", None)
            tool_input = getattr(block, "input", None)
            result = getattr(block, "result", None) or getattr(block, "content", None)
            if block_type == "tool_use" or name:
                events.append(("cmd", _format_tool_call(name, tool_input)))
            elif block_type == "tool_result" or result:
                events.append(("out", _shorten(str(result))))
            elif text:
                events.append(("think", _shorten(str(text))))
    elif isinstance(content, str):
        events.append(("think", _shorten(content)))
    elif hasattr(message, "result"):
        result = str(getattr(message, "result"))
        events.append(("ok" if "error" not in result.lower() else "err", _shorten(result)))
    else:
        text = str(message)
        if text:
            events.append(("out", _shorten(text)))
    return events


def _format_tool_call(name: Any, tool_input: Any) -> str:
    if name == "Bash" and isinstance(tool_input, dict):
        return str(tool_input.get("command") or tool_input)
    return f"{name or 'tool'} {tool_input or ''}".strip()


async def _log(bus: EventBus, event_type: str, text: str) -> None:
    await bus.publish({"kind": "log", "type": event_type, "text": text})


async def _telemetry(bus: EventBus, step: int) -> None:
    await bus.publish(
        {
            "kind": "telemetry",
            "joints": [round(0.05 * step + i * 0.01, 3) for i in range(5)],
            "gripper": "closed" if step % 2 else "open",
            "successRate": round(93.5 + min(step, 5) * 0.4, 1),
            "latencyMs": 38 + step * 3,
        }
    )


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, separators=(',', ':'))}\n\n"


def _camera_roles(config: HWExecConfig) -> dict[str, int | str]:
    if config.cameras.roles:
        return dict(config.cameras.roles)
    names = ["front", "side", "wrist"]
    return {name: config.cameras.indices[i] for i, name in enumerate(names) if i < len(config.cameras.indices)}


async def _mjpeg_stream(camera_index: int | str, config: HWExecConfig) -> AsyncIterator[bytes]:
    try:
        import cv2  # type: ignore
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"OpenCV is not importable for camera streaming: {exc}") from exc

    cap = cv2.VideoCapture(camera_index)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.cameras.width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.cameras.height)
    cap.set(cv2.CAP_PROP_FPS, config.cameras.fps)
    if not cap.isOpened():
        cap.release()
        raise HTTPException(status_code=503, detail=f"Camera `{camera_index}` could not be opened.")

    frame_delay = 1 / max(config.cameras.fps, 1)
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                await asyncio.sleep(frame_delay)
                continue
            ok, encoded = cv2.imencode(".jpg", frame)
            if ok:
                payload = encoded.tobytes()
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + payload + b"\r\n"
            await asyncio.sleep(frame_delay)
    finally:
        cap.release()


def _shorten(text: str, limit: int = 500) -> str:
    cleaned = " ".join(text.strip().split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1] + "…"
