"""Stage 1 — Input capture agents (6, deterministic)."""
from __future__ import annotations

import time
from typing import Any, Callable

# Rate guard: sliding window per submitter identity (phone or IP).
_rate_window: dict[str, list[float]] = {}
RATE_LIMIT_PER_HOUR = 10


def _agent(name: str, record: dict, ctx: dict, fn: Callable[[dict, dict], Any]) -> None:
    t0 = time.perf_counter()
    try:
        fn(record, ctx)
        status, summary = "ok", ctx.get(f"_sum_{name}", "")
    except Exception as exc:  # noqa: BLE001 — one agent failing never kills the stage
        status, summary = "failed", f"{type(exc).__name__}: {exc}"
    record["trace"].append(
        {"agent": name, "stage": 1, "status": status,
         "ms": round((time.perf_counter() - t0) * 1000, 1), "summary": summary}
    )


def text_ingest(record: dict, ctx: dict) -> None:
    text = ctx["payload"].get("text") or ""
    if ctx["payload"].get("transcript_hint"):
        text = text or ctx["payload"]["transcript_hint"]
    ctx["text"] = text
    ctx["_sum_text_ingest"] = f"{len(text)} chars captured"
    from app.schemas.shared_record import set_key
    set_key(record, "stage1_input.raw_text", text[:4000])


def voice_ingest(record: dict, ctx: dict) -> None:
    ref = ctx["payload"].get("audio_ref")
    if ref:
        ctx["has_audio"] = True
    ctx["_sum_voice_ingest"] = "audio attached" if ref else "no audio"
    from app.schemas.shared_record import set_key
    set_key(record, "stage1_input.audio_blob_ref", ref)


def photo_ingest(record: dict, ctx: dict) -> None:
    ref = ctx["payload"].get("photo_ref")
    if ref:
        ctx["has_photo"] = True
    ctx["_sum_photo_ingest"] = "photo attached" if ref else "no photo"
    from app.schemas.shared_record import set_key
    set_key(record, "stage1_input.photo_blob_ref", ref)


def messaging_ingest(record: dict, ctx: dict) -> None:
    payload = ctx["payload"]
    normalized = {
        "channel": payload.get("channel", "text"),
        "phone_masked": (payload.get("phone") or "")[:4] + "****" + (payload.get("phone") or "")[-4:] if payload.get("phone") else None,
        "geo_provided": payload.get("lat") is not None,
    }
    ctx["submitter"] = payload.get("phone") or payload.get("client_ip") or "anon"
    ctx["_sum_messaging_ingest"] = f"channel={normalized['channel']}"
    from app.schemas.shared_record import set_key
    set_key(record, "stage1_input.normalized_payload", normalized)


def input_validator(record: dict, ctx: dict) -> None:
    text = ctx.get("text", "")
    has_media = ctx.get("has_audio") or ctx.get("has_photo")
    valid = bool(text.strip()) or bool(has_media)
    reason = None if valid else "empty submission: no text, audio or photo"
    ctx["_sum_input_validator"] = "valid" if valid else reason
    from app.schemas.shared_record import set_key
    set_key(record, "stage1_input.input_valid", valid)
    set_key(record, "stage1_input.rejection_reason", reason)


def rate_guard(record: dict, ctx: dict) -> None:
    import time as _t

    ident = ctx.get("submitter", "anon")
    now = _t.time()
    window = [t for t in _rate_window.get(ident, []) if now - t < 3600]
    limited = len(window) >= RATE_LIMIT_PER_HOUR
    if not limited:
        window.append(now)
    _rate_window[ident] = window
    ctx["rate_limited"] = limited
    ctx["_sum_rate_guard"] = f"{len(window)}/10 in window"
    from app.schemas.shared_record import set_key
    set_key(record, "stage1_input.rate_limited", limited)


AGENTS = {
    "text_ingest": text_ingest,
    "voice_ingest": voice_ingest,
    "photo_ingest": photo_ingest,
    "messaging_ingest": messaging_ingest,
    "input_validator": input_validator,
    "rate_guard": rate_guard,
}


async def run_all(record: dict, ctx: dict) -> None:
    import asyncio

    await asyncio.gather(*[
        asyncio.to_thread(_agent, name, record, ctx, fn)
        for name, fn in AGENTS.items()
    ])
