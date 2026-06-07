from __future__ import annotations

from hwexec.config import SafetyConfig


def normalize_joint_targets(raw_targets: list[float] | dict[str, float], safety: SafetyConfig) -> dict[str, float]:
    if isinstance(raw_targets, dict):
        return {str(name): float(value) for name, value in raw_targets.items()}

    if len(raw_targets) != len(safety.joint_names):
        raise ValueError(
            f"Expected {len(safety.joint_names)} joint values "
            f"({', '.join(safety.joint_names)}), got {len(raw_targets)}."
        )
    return {name: float(value) for name, value in zip(safety.joint_names, raw_targets, strict=True)}


def clamp_joint_targets(targets: dict[str, float], safety: SafetyConfig) -> tuple[dict[str, float], dict[str, tuple[float, float]]]:
    clamped: dict[str, float] = {}
    changed: dict[str, tuple[float, float]] = {}
    for joint, value in targets.items():
        lo, hi = safety.joint_limits.get(joint, (-100.0, 100.0))
        safe_value = min(max(float(value), lo), hi)
        clamped[joint] = safe_value
        if safe_value != value:
            changed[joint] = (float(value), safe_value)
    return clamped, changed


def interpolate_targets(
    current: dict[str, float],
    target: dict[str, float],
    max_step_delta: float,
) -> list[dict[str, float]]:
    if max_step_delta <= 0:
        return [target]

    max_delta = max(abs(target[j] - current.get(j, 0.0)) for j in target) if target else 0.0
    steps = max(1, int(max_delta / max_step_delta) + (1 if max_delta % max_step_delta else 0))
    path: list[dict[str, float]] = []
    for step in range(1, steps + 1):
        alpha = step / steps
        path.append({joint: current.get(joint, 0.0) + (value - current.get(joint, 0.0)) * alpha for joint, value in target.items()})
    return path
