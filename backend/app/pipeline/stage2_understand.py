"""Stage 2 — Understanding agents (9).

LLM agents share ONE batched Gemini inference per submission (memoized in ctx
as ctx['understanding']), then fan out to their own keys. The trace still shows
each agent individually.
"""
from __future__ import annotations

import asyncio
import re
import time
from typing import Callable

from app.schemas.shared_record import set_key
from app.services import gemini_service


def _get_understanding(ctx: dict) -> dict:
    if "understanding" not in ctx:
        ctx["understanding"] = gemini_service.extract_complaint(
            ctx.get("text", ""), ctx.get("has_photo", False), ctx.get("has_audio", False)
        )
    return ctx["understanding"]


def _agent(name: str, stage: int, record: dict, ctx: dict, fn: Callable[[dict, dict], Any]) -> None:
    t0 = time.perf_counter()
    try:
        fn(record, ctx)
        status, summary = "ok", ctx.get(f"_sum_{name}", "")
    except Exception as exc:  # noqa: BLE001
        status, summary = "failed", f"{type(exc).__name__}: {exc}"
    record["trace"].append(
        {"agent": name, "stage": stage, "status": status,
         "ms": round((time.perf_counter() - t0) * 1000, 1), "summary": summary}
    )


def transcriber(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    ctx["_sum_transcriber"] = f"{u['detected_language']} transcript"
    set_key(record, "stage2_understand.transcript", u["transcript"] or ctx.get("text", ""))


def language_detector(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    ctx["_sum_language_detector"] = u["detected_language"]
    set_key(record, "stage2_understand.detected_language", u["detected_language"])


def image_captioner(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    ctx["_sum_image_captioner"] = "photo" if u["image_caption"] else "none"
    set_key(record, "stage2_understand.image_caption", u["image_caption"])


def image_verifier(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    ctx["_sum_image_verifier"] = "relevant" if u["image_relevant"] else "n/a"
    set_key(record, "stage2_understand.image_relevant", u["image_relevant"])


def intent_classifier(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    ctx["category"] = u["category"]
    ctx["_sum_intent_classifier"] = f"{u['category']} ({'llm' if u.get('llm_used') else 'rules'})"
    set_key(record, "stage2_understand.category", u["category"])


def subcategory_tagger(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    ctx["_sum_subcategory_tagger"] = u["subcategory"]
    set_key(record, "stage2_understand.subcategory", u["subcategory"])


def location_extractor(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    payload = ctx["payload"]
    loc = {
        "landmarks": u["detected_landmarks"],
        "lat": payload.get("lat"),
        "lng": payload.get("lng"),
        "ward_id_hint": payload.get("ward_id"),
    }
    ctx["landmarks"] = u["detected_landmarks"]
    ctx["_sum_location_extractor"] = f"{len(u['detected_landmarks'])} landmark(s)"
    set_key(record, "stage2_understand.extracted_location", loc)


def severity_assessor(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    ctx["severity"] = u["severity_score"]
    ctx["_sum_severity_assessor"] = f"{u['severity_score']}/5"
    set_key(record, "stage2_understand.severity", u["severity_score"])


def understanding_validator(record: dict, ctx: dict) -> None:
    u = _get_understanding(ctx)
    severity = u["severity_score"]
    urgency = {1: "Low", 2: "Low", 3: "Medium", 4: "High", 5: "Emergency"}[severity]
    low = ctx.get("text", "").lower()
    if re.search(r"(bahut|very|urgent|immediately|turant|abhi)", low):
        urgency = "Emergency" if severity >= 4 else "High"
    sentiment = "angry" if re.search(r"(bahut|worst|pathetic|disgust)", low) else "concerned"
    valid = bool(u.get("category")) and 1 <= severity <= 5
    ctx["urgency"] = urgency
    ctx["_sum_understanding_validator"] = f"urgency={urgency}, valid={valid}"
    set_key(record, "stage2_understand.urgency", urgency)
    set_key(record, "stage2_understand.sentiment", sentiment)
    set_key(record, "stage2_understand.understanding_valid", valid)
    # stash the standardized summary for persistence
    ctx["standardized_summary"] = u["standardized_summary"]


AGENTS = {
    "transcriber": transcriber,
    "language_detector": language_detector,
    "image_captioner": image_captioner,
    "image_verifier": image_verifier,
    "intent_classifier": intent_classifier,
    "subcategory_tagger": subcategory_tagger,
    "location_extractor": location_extractor,
    "severity_assessor": severity_assessor,
    "understanding_validator": understanding_validator,
}


async def run_all(record: dict, ctx: dict) -> None:
    await asyncio.gather(*[
        asyncio.to_thread(_agent, name, 2, record, ctx, fn)
        for name, fn in AGENTS.items()
    ])
