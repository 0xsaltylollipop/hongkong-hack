from __future__ import annotations

import json
import shutil
import signal
import subprocess
import time
from pathlib import Path
from typing import Any

from hwexec.config import HWExecConfig
from hwexec.errors import HardwareUnavailableError, PolicyUnavailableError
from hwexec.image import save_camera_frame, write_mock_ppm
from hwexec.logging import log_event
from hwexec.safety import clamp_joint_targets, interpolate_targets


class BaseBackend:
    def observe(self, image_path: Path, dry_run: bool = False) -> dict[str, Any]:
        raise NotImplementedError

    def move(self, targets: dict[str, float], dry_run: bool) -> dict[str, Any]:
        raise NotImplementedError

    def gripper(self, action: str, dry_run: bool) -> dict[str, Any]:
        raise NotImplementedError

    def run_policy(self, steps: int | None, duration: float | None, dry_run: bool) -> dict[str, Any]:
        raise NotImplementedError

    def dataset_inspect(self, dry_run: bool) -> dict[str, Any]:
        raise NotImplementedError


class MockBackend(BaseBackend):
    def __init__(self, config: HWExecConfig):
        self.config = config
        self.current = dict(config.safety.named_poses.get("home", _zero_pose(config)))

    def observe(self, image_path: Path, dry_run: bool = False) -> dict[str, Any]:
        write_mock_ppm(image_path, self.config.cameras.width, self.config.cameras.height)
        observation = {
            "mode": "mock",
            "dry_run": dry_run,
            "joints": self.current,
            "image_path": str(image_path),
            "camera": {"index": self.config.cameras.indices[0] if self.config.cameras.indices else 0},
        }
        log_event("observe", result=observation)
        return observation

    def move(self, targets: dict[str, float], dry_run: bool) -> dict[str, Any]:
        clamped, changed = clamp_joint_targets(targets, self.config.safety)
        path = interpolate_targets(self.current, clamped, self.config.safety.max_step_delta)
        log_event("move.start", mode="mock", dry_run=dry_run, target=clamped, clamped=changed, steps=len(path))
        if not dry_run:
            for step in path:
                self.current.update(step)
                time.sleep(min(self.config.safety.step_delay_s, 0.02))
        result = {"mode": "mock", "dry_run": dry_run, "target": clamped, "clamped": changed, "steps": len(path)}
        log_event("move.done", result=result)
        return result

    def gripper(self, action: str, dry_run: bool) -> dict[str, Any]:
        value = self.config.safety.gripper_open if action == "open" else self.config.safety.gripper_closed
        return self.move({"gripper": value}, dry_run=dry_run)

    def run_policy(self, steps: int | None, duration: float | None, dry_run: bool) -> dict[str, Any]:
        steps = steps or max(1, int((duration or 2) * self.config.policy.fps))
        log_event("policy.start", mode="mock", dry_run=dry_run, steps=steps)
        for i in range(steps):
            if i >= 5 and dry_run:
                break
            log_event("policy.step", mode="mock", step=i + 1, joints=self.current)
            if not dry_run:
                time.sleep(1 / max(self.config.policy.fps, 1))
        result = {"mode": "mock", "dry_run": dry_run, "steps_requested": steps}
        log_event("policy.done", result=result)
        return result

    def dataset_inspect(self, dry_run: bool) -> dict[str, Any]:
        result = {
            "mode": "mock",
            "dry_run": dry_run,
            "repo_id": self.config.dataset.repo_id,
            "local_path": self.config.dataset.local_path,
            "episodes": 3,
            "frames": 900,
            "fps": self.config.policy.fps,
            "fields": ["observation.state", "observation.images.cam_0", "action", "timestamp"],
        }
        log_event("dataset.inspect", result=result)
        return result


class LeRobotBackend(BaseBackend):
    def __init__(self, config: HWExecConfig):
        self.config = config
        self._robot: Any | None = None
        self._current = dict(config.safety.named_poses.get("home", _zero_pose(config)))

    def observe(self, image_path: Path, dry_run: bool = False) -> dict[str, Any]:
        if dry_run:
            result = {
                "mode": "hardware",
                "dry_run": True,
                "would_read": {
                    "robot_type": self.config.robot.type,
                    "port": self.config.robot.follower_port,
                    "camera_indices": self.config.cameras.indices[: self.config.cameras.count],
                    "image_path": str(image_path),
                },
            }
            log_event("observe", result=result)
            return result

        robot = self._connect_robot()
        obs = robot.get_observation()
        joints = _extract_joints(obs)
        frame = _extract_first_frame(obs)
        if frame is not None:
            save_camera_frame(frame, image_path)
        result = {"mode": "hardware", "joints": joints, "image_path": str(image_path) if frame is not None else None}
        self._current.update(joints)
        log_event("observe", result=result)
        return result

    def move(self, targets: dict[str, float], dry_run: bool) -> dict[str, Any]:
        clamped, changed = clamp_joint_targets(targets, self.config.safety)
        path = interpolate_targets(self._current, clamped, self.config.safety.max_step_delta)
        log_event("move.start", mode="hardware", dry_run=dry_run, target=clamped, clamped=changed, steps=len(path))
        if dry_run:
            return {"mode": "hardware", "dry_run": True, "target": clamped, "clamped": changed, "steps": len(path)}

        robot = self._connect_robot()
        try:
            for step in path:
                action = {f"{joint}.pos": value for joint, value in step.items()}
                sent = robot.send_action(action)
                self._current.update(step)
                log_event("move.step", sent=sent)
                time.sleep(self.config.safety.step_delay_s)
        except KeyboardInterrupt:
            log_event("move.interrupted")
            self._safe_disconnect()
            raise
        result = {"mode": "hardware", "dry_run": False, "target": clamped, "clamped": changed, "steps": len(path)}
        log_event("move.done", result=result)
        return result

    def gripper(self, action: str, dry_run: bool) -> dict[str, Any]:
        value = self.config.safety.gripper_open if action == "open" else self.config.safety.gripper_closed
        return self.move({"gripper": value}, dry_run=dry_run)

    def run_policy(self, steps: int | None, duration: float | None, dry_run: bool) -> dict[str, Any]:
        if not self.config.policy.path:
            raise PolicyUnavailableError("policy.path is empty in config.")

        duration = duration or (steps / self.config.policy.fps if steps else 30)
        command = self._rollout_command(duration)
        log_event("policy.command", dry_run=dry_run, command=command)
        if dry_run:
            return {"mode": "hardware", "dry_run": True, "command": command}
        return _run_interruptible(command)

    def dataset_inspect(self, dry_run: bool) -> dict[str, Any]:
        if dry_run:
            result = {
                "mode": "hardware",
                "dry_run": True,
                "repo_id": self.config.dataset.repo_id,
                "local_path": self.config.dataset.local_path,
            }
            log_event("dataset.inspect", result=result)
            return result

        try:
            from lerobot.datasets.lerobot_dataset import LeRobotDataset  # type: ignore
        except Exception as exc:
            raise HardwareUnavailableError(
                "LeRobot is not importable. Install on the hardware laptop with `pip install -e .[hardware]` "
                "or install LeRobot from source with Feetech extras."
            ) from exc

        repo_id = self.config.dataset.repo_id or None
        root = self.config.dataset.local_path or None
        if not repo_id and not root:
            raise HardwareUnavailableError("dataset.repo_id or dataset.local_path must be set.")

        dataset = LeRobotDataset(repo_id=repo_id, root=root)
        meta = getattr(dataset, "meta", None)
        result = {
            "mode": "hardware",
            "repo_id": repo_id,
            "local_path": root,
            "episodes": getattr(meta, "total_episodes", None) or getattr(dataset, "num_episodes", None),
            "frames": len(dataset),
            "fps": getattr(meta, "fps", None) or getattr(dataset, "fps", None),
            "fields": list(getattr(dataset, "features", {}).keys()),
        }
        log_event("dataset.inspect", result=result)
        return result

    def _connect_robot(self) -> Any:
        if self._robot is not None:
            return self._robot

        try:
            from lerobot.cameras.opencv import OpenCVCameraConfig  # type: ignore
        except Exception as exc:
            raise HardwareUnavailableError(
                "Could not import LeRobot camera API. Install LeRobot with Feetech/camera extras on the hardware laptop."
            ) from exc

        try:
            from lerobot.robots.so_follower import SO101Follower, SO101FollowerConfig  # type: ignore
        except Exception:
            try:
                from lerobot.robots.so101_follower import SO101Follower, SO101FollowerConfig  # type: ignore
            except Exception as exc:
                raise HardwareUnavailableError(
                    "Could not import LeRobot SO101 Python API. Targeted API: LeRobot main/v0.5.1 "
                    "`lerobot.robots.so_follower.SO101FollowerConfig` and `SO101Follower`. "
                    "If the hardware laptop has a different LeRobot checkout, adjust this adapter only."
                ) from exc

        try:
            cfg = SO101FollowerConfig(
                id=self.config.robot.id,
                port=self.config.robot.follower_port,
                cameras={
                    f"cam_{i}": OpenCVCameraConfig(
                        index_or_path=index,
                        width=self.config.cameras.width,
                        height=self.config.cameras.height,
                        fps=self.config.cameras.fps,
                    )
                    for i, index in enumerate(self.config.cameras.indices[: self.config.cameras.count])
                },
                calibration_dir=self.config.robot.calibration_dir,
            )
        except TypeError as exc:
            raise HardwareUnavailableError(
                "LeRobot SO101 config constructor did not match the targeted API. "
                "Check the installed LeRobot version and update hwexec/backends.py on the hardware laptop."
            ) from exc

        robot = SO101Follower(cfg)
        robot.connect()
        self._robot = robot
        signal.signal(signal.SIGINT, lambda _sig, _frame: self._safe_disconnect())
        return robot

    def _safe_disconnect(self) -> None:
        if self._robot is not None:
            try:
                self._robot.disconnect()
            finally:
                self._robot = None

    def _rollout_command(self, duration: float) -> list[str]:
        command = [
            "lerobot-rollout",
            "--strategy.type=base",
            f"--policy.path={self.config.policy.path}",
            f"--robot.type={self.config.robot.type}",
            f"--robot.port={self.config.robot.follower_port}",
            f"--task={self.config.policy.task}",
            f"--duration={duration}",
            f"--fps={self.config.policy.fps}",
        ]
        if self.config.policy.device != "auto":
            command.append(f"--device={self.config.policy.device}")
        if self.config.cameras.indices:
            camera_config = {
                f"cam_{i}": {
                    "type": "opencv",
                    "index_or_path": index,
                    "width": self.config.cameras.width,
                    "height": self.config.cameras.height,
                    "fps": self.config.cameras.fps,
                }
                for i, index in enumerate(self.config.cameras.indices[: self.config.cameras.count])
            }
            command.append(f"--robot.cameras={json.dumps(camera_config)}")
        return command


def make_backend(config: HWExecConfig, mock: bool) -> BaseBackend:
    return MockBackend(config) if mock else LeRobotBackend(config)


def _zero_pose(config: HWExecConfig) -> dict[str, float]:
    return {joint: 0.0 for joint in config.safety.joint_names}


def _extract_joints(obs: dict[str, Any]) -> dict[str, float]:
    joints: dict[str, float] = {}
    for key, value in obs.items():
        if key.endswith(".pos"):
            joints[key.removesuffix(".pos")] = float(value)
    return joints


def _extract_first_frame(obs: dict[str, Any]) -> Any | None:
    for key, value in obs.items():
        if "image" in key or "cam" in key:
            return value
    return None


def _run_interruptible(command: list[str]) -> dict[str, Any]:
    if not shutil.which(command[0]):
        raise PolicyUnavailableError(f"`{command[0]}` not found. Install LeRobot on the hardware laptop.")

    proc = subprocess.Popen(command)
    try:
        return_code = proc.wait()
    except KeyboardInterrupt:
        log_event("policy.interrupted")
        proc.send_signal(signal.SIGINT)
        return_code = proc.wait(timeout=10)

    result = {"command": command, "return_code": return_code}
    log_event("policy.done", result=result)
    if return_code != 0:
        raise PolicyUnavailableError(f"Policy command exited with {return_code}.")
    return result
