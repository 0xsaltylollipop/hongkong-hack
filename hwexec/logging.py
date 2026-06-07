from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def log_event(event: str, **payload: Any) -> None:
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **payload,
    }
    print(json.dumps(record, sort_keys=True, default=str), flush=True)
