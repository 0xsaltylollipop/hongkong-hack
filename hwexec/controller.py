from __future__ import annotations

from pathlib import Path
from typing import Any

from hwexec.backends import BaseBackend, make_backend
from hwexec.config import HWExecConfig
from hwexec.safety import normalize_joint_targets


class HWExecController:
    def __init__(self, config: HWExecConfig, mock: bool = False):
        self.config = config
        self.backend: BaseBackend = make_backend(config, mock=mock)

    def observe(self, image_path: Path, dry_run: bool = False) -> dict[str, Any]:
        return self.backend.observe(image_path=image_path, dry_run=dry_run)

    def move(
        self,
        targets: list[float] | dict[str, float] | None = None,
        pose: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        if pose:
            if pose not in self.config.safety.named_poses:
                available = ", ".join(sorted(self.config.safety.named_poses))
                raise ValueError(f"Unknown pose `{pose}`. Available poses: {available}")
            target_dict = self.config.safety.named_poses[pose]
        elif targets is not None:
            target_dict = normalize_joint_targets(targets, self.config.safety)
        else:
            raise ValueError("Provide either joint targets or a named pose.")
        return self.backend.move(target_dict, dry_run=dry_run)

    def gripper(self, action: str, dry_run: bool = False) -> dict[str, Any]:
        if action not in {"open", "close"}:
            raise ValueError("Gripper action must be `open` or `close`.")
        return self.backend.gripper(action, dry_run=dry_run)

    def run_policy(
        self,
        steps: int | None = None,
        duration: float | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        return self.backend.run_policy(steps=steps, duration=duration, dry_run=dry_run)

    def dataset_inspect(self, dry_run: bool = False) -> dict[str, Any]:
        return self.backend.dataset_inspect(dry_run=dry_run)
