"""In-memory trace store. The Pipeline Live Viewer polls GET /api/v1/pipeline/{id}."""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any

_lock = threading.Lock()
_traces: dict[str, dict[str, Any]] = {}
_MAX = 200


def create(submission_id: str, channel: str) -> None:
    with _lock:
        if len(_traces) >= _MAX:
            oldest = min(_traces, key=lambda k: _traces[k]["received_at"])
            _traces.pop(oldest, None)
        _traces[submission_id] = {
            "submission_id": submission_id,
            "status": "running",
            "received_at": datetime.now(timezone.utc).isoformat(),
            "current_stage": 0,
            "stages": [],
            "record": None,
            "result": None,
        }


def set_stage(stage: int) -> None:
    with _lock:
        for t in _traces.values():
            if t["status"] == "running":
                t["current_stage"] = stage


def append_stage(submission_id: str, stage_block: dict) -> None:
    with _lock:
        t = _traces.get(submission_id)
        if t:
            t["stages"].append(stage_block)


def set_record(submission_id: str, record: dict) -> None:
    with _lock:
        t = _traces.get(submission_id)
        if t:
            t["record"] = record


def finish(submission_id: str, status: str, result: dict | None) -> None:
    with _lock:
        t = _traces.get(submission_id)
        if t:
            t["status"] = status
            t["result"] = result


def get(submission_id: str) -> dict | None:
    with _lock:
        return _traces.get(submission_id)
