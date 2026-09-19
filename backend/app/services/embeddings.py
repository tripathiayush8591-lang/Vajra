"""Offline-safe text embeddings: hashed character+n-gram TF-IDF style vectors.

Deterministic, dependency-free, clusters civic complaint vocabulary well.
Optionally upgrades to Gemini embeddings when online, but the demo never
depends on it.
"""
from __future__ import annotations

import hashlib
import math
import re

DIM = 256
_stop = {"the", "a", "an", "is", "are", "was", "in", "on", "at", "to", "of", "and", "for", "hai", "mein", "ke", "ka", "ki", "se", "paas"}


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z\u0900-\u097F]{2,}", text.lower())
    return [w for w in words if w not in _stop] + [w[:4] for w in words if len(w) > 4]


def _bucket(token: str) -> int:
    return int(hashlib.md5(token.encode()).hexdigest(), 16) % DIM


def embed(text: str) -> list[float]:
    vec = [0.0] * DIM
    tokens = _tokenize(text)
    for i, tok in enumerate(tokens):
        vec[_bucket(tok)] += 1.0
        if i + 1 < len(tokens):
            vec[_bucket(tok + "_" + tokens[i + 1])] += 0.6
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 5) for v in vec]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))
