from __future__ import annotations

from pathlib import Path


def write_mock_ppm(path: Path, width: int = 320, height: int = 240) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        f.write(f"P6\n{width} {height}\n255\n".encode("ascii"))
        for y in range(height):
            for x in range(width):
                f.write(bytes(((x * 255) // width, (y * 255) // height, 120)))
    return path


def save_camera_frame(frame: object, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if hasattr(frame, "save"):
        frame.save(path)  # Pillow image
        return path
    try:
        import imageio.v3 as iio  # type: ignore

        iio.imwrite(path, frame)
        return path
    except Exception:
        pass

    try:
        import cv2  # type: ignore

        cv2.imwrite(str(path), frame)
        return path
    except Exception as exc:
        raise RuntimeError(
            "Could not save camera frame. Install pillow/imageio/opencv or use --mock."
        ) from exc
