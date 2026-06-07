from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from hwexec.config import load_config
from hwexec.controller import HWExecController
from hwexec.errors import HWExecError


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not hasattr(args, "dry_run"):
        args.dry_run = False
    if not hasattr(args, "handler"):
        parser.print_help()
        return 0

    try:
        config = load_config(args.config)
        controller = HWExecController(config, mock=args.mock)
        result = args.handler(args, controller)
        if result is not None:
            print(json.dumps(result, indent=2, sort_keys=True, default=str))
        return 0
    except (HWExecError, ValueError, FileNotFoundError) as exc:
        print(f"hwexec error: {exc}")
        return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hwexec", description="Agent-drivable SO101 hardware execution CLI.")
    parser.add_argument("--config", default=None, help="Path to config YAML. Defaults to HWEXEC_CONFIG, config.yaml, then config.example.yaml.")
    parser.add_argument("--mock", action="store_true", help="Use fake but plausible robot behavior. No hardware needed.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned hardware actions without sending them.")

    sub = parser.add_subparsers(dest="command")

    observe = sub.add_parser("observe", help="Read joints and one camera frame.")
    observe.add_argument("--dry-run", action="store_true", default=argparse.SUPPRESS, help="Print planned observation without opening hardware.")
    observe.add_argument("--image", default="observations/latest.ppm", help="Where to save the camera image.")
    observe.set_defaults(handler=_observe)

    move = sub.add_parser("move", help="Move to joint targets or a named pose.")
    move.add_argument("--dry-run", action="store_true", default=argparse.SUPPRESS, help="Print planned motion without sending it.")
    move.add_argument("--pose", help="Named pose from config.")
    move.add_argument("--joints", nargs="*", type=float, help="Joint targets in configured joint order.")
    move.set_defaults(handler=_move)

    gripper = sub.add_parser("gripper", help="Open or close the gripper.")
    gripper.add_argument("--dry-run", action="store_true", default=argparse.SUPPRESS, help="Print planned gripper action without sending it.")
    gripper.add_argument("action", choices=["open", "close"])
    gripper.set_defaults(handler=_gripper)

    policy = sub.add_parser("run-policy", help="Run configured LeRobot ACT policy.")
    policy.add_argument("--dry-run", action="store_true", default=argparse.SUPPRESS, help="Print LeRobot rollout command without running it.")
    policy.add_argument("--steps", type=int, default=None, help="Approximate control steps to run.")
    policy.add_argument("--duration", type=float, default=None, help="Duration in seconds.")
    policy.set_defaults(handler=_run_policy)

    dataset = sub.add_parser("dataset", help="Dataset utilities.")
    dataset_sub = dataset.add_subparsers(dest="dataset_command")
    inspect = dataset_sub.add_parser("inspect", help="Summarize configured LeRobot dataset.")
    inspect.add_argument("--dry-run", action="store_true", default=argparse.SUPPRESS, help="Print configured dataset target without loading it.")
    inspect.set_defaults(handler=_dataset_inspect)

    serve = sub.add_parser("serve", help="Serve the control-plane UI and thin web API.")
    serve.add_argument("--mock", action="store_true", default=argparse.SUPPRESS, help="Run server endpoints in mock mode.")
    serve.add_argument("--host", default=None, help="Host to bind. Defaults to config or HWEXEC_HOST.")
    serve.add_argument("--port", type=int, default=None, help="Port to bind. Defaults to config, HWEXEC_PORT, or 8765.")
    serve.set_defaults(handler=_serve)

    return parser


def _observe(args: argparse.Namespace, controller: HWExecController) -> dict[str, Any]:
    return controller.observe(Path(args.image), dry_run=args.dry_run)


def _move(args: argparse.Namespace, controller: HWExecController) -> dict[str, Any]:
    joints = args.joints if args.joints else None
    return controller.move(targets=joints, pose=args.pose, dry_run=args.dry_run)


def _gripper(args: argparse.Namespace, controller: HWExecController) -> dict[str, Any]:
    return controller.gripper(args.action, dry_run=args.dry_run)


def _run_policy(args: argparse.Namespace, controller: HWExecController) -> dict[str, Any]:
    return controller.run_policy(steps=args.steps, duration=args.duration, dry_run=args.dry_run)


def _dataset_inspect(args: argparse.Namespace, controller: HWExecController) -> dict[str, Any]:
    return controller.dataset_inspect(dry_run=args.dry_run)


def _serve(args: argparse.Namespace, controller: HWExecController) -> None:
    from hwexec.server import serve

    serve(controller.config, mock=args.mock, host=args.host, port=args.port)
    return None


if __name__ == "__main__":
    raise SystemExit(main())
