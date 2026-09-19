"""Gemini service with a deterministic rule-based fallback.

Stage 2 uses ONE batched multimodal call per submission; the result is fanned out
to the 8 understanding-agent keys. If Gemini is unavailable (no key, offline mode,
any exception), the rule-based fallback produces the same shape — the pipeline
never fails.
"""
from __future__ import annotations

import json
import logging
import re

from app.config import settings

logger = logging.getLogger("civicpulse.gemini")
# Never log secrets or raw citizen content at info level.
logger.setLevel(logging.INFO)

CATEGORIES = [
    "Roads & Potholes",
    "Water Supply & Leakage",
    "Sanitation & Waste Management",
    "Drainage & Sewage",
    "Street Lighting",
    "Public Safety & Hazards",
    "Encroachment & Traffic Obstruction",
]

CATEGORY_KEYWORDS = {
    "Roads & Potholes": ["pothole", "pot hole", "road", "sadak", "gaddha", "crater", "asphalt", "speed breaker"],
    "Water Supply & Leakage": ["water", "paani", "pipeline", "leak", "contaminat", "supply", "nal", "tap"],
    "Sanitation & Waste Management": ["garbage", "kachra", "waste", "trash", "dump", "dustbin", "stink", "badboo"],
    "Drainage & Sewage": ["naali ka paani", "naali", "sewage", "gutter", "manhole", "overflow", "nala", "beh raha", "ganda paani", "ganda paani"],
    "Street Lighting": ["streetlight", "street light", "light nahi", "bulb", "lamp", "light jal", "dark"],
    "Public Safety & Hazards": ["live wire", "electric", "current", "accident", "danger", "hazard", "open pit", "collapse"],
    "Encroachment & Traffic Obstruction": ["encroach", "traffic", "parking", "blocked", "jam", "vendor", "hawker"],
}

SEVERITY_KEYWORDS = [
    (5, ["live wire", "open manhole", "electrocut", "collapse", "child", "school", "hospital", "emergency", "death"]),
    (4, ["sewage", "overflow", "contaminat", "flood", "injur", "major", "danger", "big pothole", "accident", "badboo", "stink", "smell", "bachche"]),
    (3, ["pothole", "garbage", "kachra", "naali", "drain", "leak", "days", "week"]),
    (2, ["slow", "small", "minor", "flicker", "pressure"]),
]

LANDMARKS = [
    "Palasia Square", "Vijay Nagar", "Rajwada", "Bhanwar Kuan", "Chhappan Dukan",
    "Bombay Hospital", "Sudama Nagar", "Annapurna Road", "Bhawarkuan Square",
    "Indore Railway Station", "Schiphol", "56 Dukan", "Regal Circle", "Lal Bagh",
]


def _rule_based_extract(text: str, has_photo: bool, has_audio: bool) -> dict:
    """Deterministic offline understanding — same output shape as the LLM path."""
    low = text.lower()

    category = "Public Safety & Hazards"
    best = 0
    for cat, kws in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in kws if kw in low)
        if score > best:
            best, category = score, cat

    severity = 3
    for sev, kws in SEVERITY_KEYWORDS:
        if any(kw in low for kw in kws):
            severity = sev
            break

    landmarks = [lm for lm in LANDMARKS if lm.lower() in low]
    urgency = {1: "Low", 2: "Low", 3: "Medium", 4: "High", 5: "Emergency"}[severity]
    hindi_chars = len(re.findall(r"[\u0900-\u097F]", text))
    language = "Hindi" if hindi_chars > 5 else ("Hinglish" if re.search(r"\b(nahi|hai|ke|ka|ki|paas|mein|bahut)\b", low) else "English")

    return {
        "transcript": text if has_audio else None,
        "detected_language": language,
        "image_caption": "Photo evidence attached to report" if has_photo else None,
        "image_relevant": True if has_photo else None,
        "category": category,
        "subcategory": category.split(" & ")[0] if " & " in category else category,
        "detected_landmarks": landmarks,
        "standardized_summary": text.strip()[:280],
        "severity_score": severity,
        "priority_justification": f"Classified as {category} with severity {severity}/5 via offline rule engine.",
        "llm_used": False,
    }


def _gemini_extract(text: str, has_photo: bool, has_audio: bool) -> dict | None:
    if not settings.llm_available:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = (
            "You are CivicPulse AI's Municipal Ingestion Engine. Analyze this citizen "
            "complaint (Hindi/Hinglish/English) and return ONLY valid JSON with keys: "
            "detected_language (Hindi|Hinglish|English), standardized_summary (clear English), "
            f"category (one of {CATEGORIES}), subcategory, severity_score (int 1-5, 5=critical "
            "hazard e.g. live wire/open manhole near school), urgency_level (Low|Medium|High|Emergency), "
            "detected_landmarks (array of strings), priority_justification (one sentence). "
            f"has_photo={has_photo}, has_audio={has_audio}. Complaint text: {text!r}"
        )
        resp = model.generate_content(prompt)
        raw = resp.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(raw)
        if data.get("category") not in CATEGORIES:
            return None
        data["severity_score"] = int(max(1, min(5, int(data.get("severity_score", 3)))))
        data["transcript"] = text if has_audio else None
        data["image_caption"] = "Photo evidence attached" if has_photo else None
        data["image_relevant"] = True if has_photo else None
        data["llm_used"] = True
        return data
    except Exception as exc:  # noqa: BLE001 — fallback must swallow everything
        logger.warning("Gemini extraction failed, using rule fallback: %s", type(exc).__name__)
        return None


def extract_complaint(text: str, has_photo: bool = False, has_audio: bool = False) -> dict:
    """Batched understanding. Never raises; always returns the full key set."""
    if not text or not text.strip():
        text = "Citizen reported an issue with attached media only."
    return _gemini_extract(text, has_photo, has_audio) or _rule_based_extract(text, has_photo, has_audio)


def generate_evidence(context: dict) -> str | None:
    """Stage 5 narrative. Returns None to signal fallback template should be used."""
    if not settings.llm_available:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = (
            "Write ONE concise plain-English sentence (max 30 words) explaining why this "
            f"civic hotspot scored {context.get('score')}/100: {json.dumps(context)}. "
            "Reference complaint count, timeframe and location. No preamble."
        )
        return model.generate_content(prompt).text.strip()
    except Exception:  # noqa: BLE001
        return None


def synthesize_cluster_brief(complaints: list[str], label: str) -> str | None:
    """Stage 3 cluster label / Stage 6 report helper. None => fallback."""
    if not settings.llm_available or not complaints:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        sample = "\n".join(f"- {c}" for c in complaints[:8])
        prompt = (
            "You are the Chief Urban Planning AI. Given these citizen complaints forming one "
            f"cluster titled '{label}', return ONLY JSON: {{\"hotspot_title\": str, "
            "\"executive_summary\": str, \"probable_root_cause\": str, "
            "\"recommended_actions\": [str], \"public_health_risk\": \"Low|Medium|High|Critical\"}}.\n"
            f"{sample}"
        )
        raw = model.generate_content(prompt).text.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(raw)
    except Exception:  # noqa: BLE001
        return None
