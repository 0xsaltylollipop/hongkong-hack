from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


DEFAULT_CONFIG_PATHS = ("config.yaml", "config.example.yaml")


@dataclass(frozen=True)
class RobotConfig:
    type: str = "so101_follower"
    id: str = "so101_follower"
    follower_port: str = ""
    leader_port: str = ""
    calibration_dir: str = ".cache/calibration/so101"


@dataclass(frozen=True)
class PolicyConfig:
    path: str = ""
    device: str = "auto"
    fps: int = 30
    task: str = "Operate the SO101 arm."


@dataclass(frozen=True)
class DatasetConfig:
    repo_id: str = ""
    local_path: str = ""


@dataclass(frozen=True)
class CameraConfig:
    count: int = 1
    indices: list[int | str] = field(default_factory=lambda: [0])
    width: int = 640
    height: int = 480
    fps: int = 30


@dataclass(frozen=True)
class SafetyConfig:
    joint_names: list[str] = field(
        default_factory=lambda: [
            "shoulder_pan",
            "shoulder_lift",
            "elbow_flex",
            "wrist_flex",
            "wrist_roll",
            "gripper",
        ]
    )
    joint_limits: dict[str, tuple[float, float]] = field(default_factory=dict)
    named_poses: dict[str, dict[str, float]] = field(default_factory=dict)
    max_step_delta: float = 5.0
    step_delay_s: float = 0.12
    gripper_open: float = 80.0
    gripper_closed: float = 10.0


@dataclass(frozen=True)
class AgentConfig:
    model: str = "claude-opus-4-8"
    effort: str = "xhigh"
    max_turns: int = 8
    permission_mode: str = "acceptEdits"
    allowed_tools: list[str] = field(default_factory=lambda: ["Read", "Write", "Bash"])


@dataclass(frozen=True)
class GitHubConfig:
    repo: str = ""


@dataclass(frozen=True)
class HWExecConfig:
    robot: RobotConfig = field(default_factory=RobotConfig)
    policy: PolicyConfig = field(default_factory=PolicyConfig)
    dataset: DatasetConfig = field(default_factory=DatasetConfig)
    cameras: CameraConfig = field(default_factory=CameraConfig)
    safety: SafetyConfig = field(default_factory=SafetyConfig)
    agent: AgentConfig = field(default_factory=AgentConfig)
    github: GitHubConfig = field(default_factory=GitHubConfig)
    path: Path | None = None


def load_config(path: str | Path | None = None) -> HWExecConfig:
    config_path = _resolve_config_path(path)
    raw: dict[str, Any] = {}
    if config_path:
        with config_path.open("r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
    return _from_raw(raw, config_path)


def _resolve_config_path(path: str | Path | None) -> Path | None:
    candidate = path or os.environ.get("HWEXEC_CONFIG")
    if candidate:
        p = Path(candidate)
        if not p.exists():
            raise FileNotFoundError(f"Config file not found: {p}")
        return p

    for default in DEFAULT_CONFIG_PATHS:
        p = Path(default)
        if p.exists():
            return p
    return None


def _from_raw(raw: dict[str, Any], path: Path | None) -> HWExecConfig:
    robot = raw.get("robot", {}) or {}
    policy = raw.get("policy", {}) or {}
    dataset = raw.get("dataset", {}) or {}
    cameras = raw.get("cameras", {}) or {}
    safety = raw.get("safety", {}) or {}
    agent = raw.get("agent", {}) or {}
    github = raw.get("github", {}) or {}

    return HWExecConfig(
        robot=RobotConfig(**_known(robot, RobotConfig)),
        policy=PolicyConfig(**_known(policy, PolicyConfig)),
        dataset=DatasetConfig(**_known(dataset, DatasetConfig)),
        cameras=CameraConfig(**_known(cameras, CameraConfig)),
        safety=SafetyConfig(
            **{
                **_known(safety, SafetyConfig),
                "joint_limits": _limits(safety.get("joint_limits", {})),
                "named_poses": _poses(safety.get("named_poses", {})),
            }
        ),
        agent=AgentConfig(**_known(agent, AgentConfig)),
        github=GitHubConfig(**_known(github, GitHubConfig)),
        path=path,
    )


def _known(values: dict[str, Any], cls: type) -> dict[str, Any]:
    names = set(cls.__dataclass_fields__.keys())  # type: ignore[attr-defined]
    return {key: value for key, value in values.items() if key in names}


def _limits(values: dict[str, Any]) -> dict[str, tuple[float, float]]:
    return {name: (float(bounds[0]), float(bounds[1])) for name, bounds in values.items()}


def _poses(values: dict[str, Any]) -> dict[str, dict[str, float]]:
    return {
        pose_name: {joint: float(value) for joint, value in pose.items()}
        for pose_name, pose in values.items()
    }
