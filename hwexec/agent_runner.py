from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from hwexec.config import load_config


COMMAND_REFERENCE = """
hwexec command reference:
- hwexec --mock observe --image observations/agent.ppm
- hwexec --mock move --pose home --dry-run
- hwexec --mock move --joints 0 0 0 0 0 50
- hwexec --mock gripper open
- hwexec --mock gripper close
- hwexec --mock run-policy --steps 20
- hwexec --mock dataset inspect

Safety rules:
- Always observe before acting and observe again after acting.
- Move slowly; prefer named poses for home/rest.
- Never exceed configured joint limits. hwexec clamps targets, but you should still choose conservative commands.
- Use --dry-run before a new motion sequence on real hardware.
- Stop immediately if output indicates a clamp, hardware error, unexpected observation, or user interruption.
"""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hwexec-agent", description="Run Claude Code/Agent SDK against hwexec.")
    parser.add_argument("goal", nargs="+", help="Natural-language goal for the agent.")
    parser.add_argument("--config", default=None, help="Path to config YAML.")
    parser.add_argument("--mock", action="store_true", help="Tell the agent to use hwexec --mock.")
    parser.add_argument("--dry-run", action="store_true", help="Tell the agent to use hwexec --dry-run for motion/policy commands.")
    parser.add_argument("--max-turns", type=int, default=None, help="Override agent max turns.")
    args = parser.parse_args(argv)
    return asyncio.run(_run(args))


async def _run(args: argparse.Namespace) -> int:
    load_dotenv()
    config = load_config(args.config)
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set. The agent runner is installed, but cannot call Claude yet.")
        print("Smoke-test the hardware interface with: hwexec --mock observe")
        return 2

    try:
        from claude_agent_sdk import ClaudeAgentOptions, query
    except Exception as exc:
        print("claude-agent-sdk is not importable. Install dependencies with `pip install -e .`.")
        print(f"Import error: {exc}")
        return 2

    goal = " ".join(args.goal)
    mode = "--mock" if args.mock else ""
    dry_run = "--dry-run" if args.dry_run else ""
    prompt = f"""
Goal: {goal}

You are operating from repo directory {Path.cwd()}.
Use the hwexec CLI to control the robot. For this run, include these global flags where appropriate:
- mock flag: {mode or "(none)"}
- dry-run flag for motion/policy commands: {dry_run or "(none)"}

First observe. Then decide. Then call hwexec. Then verify with another observe.
Keep actions small and conservative.
"""

    options = ClaudeAgentOptions(
        cwd=Path.cwd(),
        model=config.agent.model,
        effort=config.agent.effort,
        max_turns=args.max_turns or config.agent.max_turns,
        system_prompt=_system_prompt(args.mock, args.dry_run),
        allowed_tools=config.agent.allowed_tools,
        permission_mode=config.agent.permission_mode,
    )

    async for message in query(prompt=prompt, options=options):
        _print_message(message)
    return 0


def _system_prompt(mock: bool, dry_run: bool) -> str:
    context = "You control a REAL SO101 arm through hwexec." if not mock else "You are smoke-testing a MOCK SO101 arm through hwexec."
    dry = "Motion/policy commands should include --dry-run unless explicitly verifying mock behavior." if dry_run else ""
    return f"{context}\n{dry}\n{COMMAND_REFERENCE}"


def _print_message(message: Any) -> None:
    if hasattr(message, "result"):
        print(message.result)
        return
    if hasattr(message, "content"):
        print(message.content)
        return
    print(message)


if __name__ == "__main__":
    raise SystemExit(main())
