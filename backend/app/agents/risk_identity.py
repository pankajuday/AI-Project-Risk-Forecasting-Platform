"""
Risk Identity Engine
====================
Deterministic cross-run risk matching using three layered signals:

    1. Evidence-quote identity  — strongest, exact quote match
    2. Fingerprint equality     — SHA-1 over category + sorted title tokens
    3. Token similarity         — Jaccard over title/description tokens

All functions are pure (no DB, no network, no randomness).
"""

from __future__ import annotations

import hashlib
import re
from typing import Any

# ── Stop-words stripped from token sets ──────────────────────────────────────

STOPWORDS = frozenset({
    "the", "a", "an", "of", "for", "to", "in", "is", "are",
    "no", "not", "and", "or", "on", "with", "has", "have", "there",
    "be", "been", "being", "was", "were", "will", "would", "could",
    "should", "may", "might", "can", "do", "does", "did", "its",
    "this", "that", "these", "those", "from", "by", "at", "but",
})


# ── Core helpers ─────────────────────────────────────────────────────────────

def tokens(text: str | None) -> set[str]:
    """
    Lowercase, strip punctuation, drop stop-words and ≤2-char tokens.

    >>> sorted(tokens("Authentication module has no integration tests"))
    ['authentication', 'integration', 'module', 'tests']
    """
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}


def jaccard(a: set[str], b: set[str]) -> float:
    """Jaccard similarity coefficient.  Returns 0.0 when both sets are empty."""
    if not a and not b:
        return 0.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union else 0.0


def fingerprint(risk: dict[str, Any]) -> str:
    """
    Deterministic 16-hex-char hash over (category, sorted title tokens).

    Word-order, case and punctuation are irrelevant:
        "Auth module missing tests"  ≡  "Missing tests, auth module"
    """
    cat = (risk.get("category") or "uncategorised").strip().lower()
    key = cat + "|" + " ".join(sorted(tokens(risk.get("title"))))
    return hashlib.sha1(key.encode()).hexdigest()[:16]


def similarity(a: dict[str, Any], b: dict[str, Any]) -> float:
    """
    Weighted Jaccard: 60 % title tokens, 40 % (title ∪ description) tokens.

    Category is NOT mixed in — it acts as a hard gate upstream.
    """
    ta, tb = tokens(a.get("title")), tokens(b.get("title"))
    da, db = tokens(a.get("description")), tokens(b.get("description"))
    title_sim = jaccard(ta, tb)
    body_sim = jaccard(ta | da, tb | db)
    return 0.6 * title_sim + 0.4 * body_sim


# ── Match threshold ──────────────────────────────────────────────────────────

MATCH_THRESHOLD = 0.25


# ── Reconciliation ───────────────────────────────────────────────────────────

def _normalise_quote(text: str | None) -> str:
    """Collapse whitespace + lowercase for evidence-quote comparison."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text.strip().lower())


def reconcile(
    existing: list[dict[str, Any]],
    detected: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Match *detected* risks against *existing* tracked risks.

    Parameters
    ----------
    existing : list of dict
        Each must have at least: ``id``, ``fingerprint``, ``title``,
        ``description``, ``category``, ``source_context`` (nullable),
        ``status``.
    detected : list of dict
        Each must have at least: ``title``, ``description``, ``category``,
        ``source_context`` (nullable).

    Returns
    -------
    dict with keys:
        matched        – list of {existing_id, detected_index, signal, score}
        created        – list of detected indexes that are new
        not_detected   – list of existing IDs absent from this run
        fingerprints   – list of fingerprints, one per detected risk (in order)
    """
    n_detected = len(detected)
    det_fps = [fingerprint(d) for d in detected]

    matched: list[dict[str, Any]] = []
    created: list[int] = []
    claimed_existing: set[str] = set()   # existing IDs already matched
    claimed_detected: set[int] = set()   # detected indexes already matched

    # ── Signal 1: evidence-quote identity ────────────────────────────────
    for di, det in enumerate(detected):
        if di in claimed_detected:
            continue
        det_quote = _normalise_quote(det.get("source_context"))
        if not det_quote:
            continue
        det_cat = (det.get("category") or "").strip().lower()

        for ex in existing:
            if ex["id"] in claimed_existing:
                continue
            ex_cat = (ex.get("category") or "").strip().lower()
            if det_cat != ex_cat:
                continue
            ex_quote = _normalise_quote(ex.get("source_context"))
            if ex_quote and det_quote == ex_quote:
                matched.append({
                    "existing_id": ex["id"],
                    "detected_index": di,
                    "signal": "quote",
                    "score": 1.0,
                })
                claimed_existing.add(ex["id"])
                claimed_detected.add(di)
                break

    # ── Signal 2: fingerprint equality ───────────────────────────────────
    fp_to_existing: dict[str, list[dict]] = {}
    for ex in existing:
        if ex["id"] in claimed_existing:
            continue
        fp_to_existing.setdefault(ex["fingerprint"], []).append(ex)

    for di, fp in enumerate(det_fps):
        if di in claimed_detected:
            continue
        candidates = fp_to_existing.get(fp, [])
        for ex in candidates:
            if ex["id"] not in claimed_existing:
                matched.append({
                    "existing_id": ex["id"],
                    "detected_index": di,
                    "signal": "fingerprint",
                    "score": 1.0,
                })
                claimed_existing.add(ex["id"])
                claimed_detected.add(di)
                break

    # ── Signal 3: token similarity ───────────────────────────────────────
    # Group remaining existing by category for efficiency.
    remaining_by_cat: dict[str, list[dict]] = {}
    for ex in existing:
        if ex["id"] in claimed_existing:
            continue
        cat = (ex.get("category") or "").strip().lower()
        remaining_by_cat.setdefault(cat, []).append(ex)

    # For each unmatched detected, find best match within same category.
    similarity_candidates: list[tuple[float, int, str]] = []
    for di, det in enumerate(detected):
        if di in claimed_detected:
            continue
        det_cat = (det.get("category") or "").strip().lower()
        for ex in remaining_by_cat.get(det_cat, []):
            score = similarity(det, ex)
            if score >= MATCH_THRESHOLD:
                similarity_candidates.append((score, di, ex["id"]))

    # Greedy assignment: highest score first, each side claimed at most once.
    similarity_candidates.sort(key=lambda t: t[0], reverse=True)
    for score, di, ex_id in similarity_candidates:
        if di in claimed_detected or ex_id in claimed_existing:
            continue
        matched.append({
            "existing_id": ex_id,
            "detected_index": di,
            "signal": "similarity",
            "score": round(score, 4),
        })
        claimed_existing.add(ex_id)
        claimed_detected.add(di)

    # ── Collect results ──────────────────────────────────────────────────
    created = [i for i in range(n_detected) if i not in claimed_detected]
    not_detected = [
        ex["id"] for ex in existing
        if ex["id"] not in claimed_existing
        and ex.get("status") not in ("resolved", "accepted")
    ]

    return {
        "matched": matched,
        "created": created,
        "not_detected": not_detected,
        "fingerprints": det_fps,
    }
