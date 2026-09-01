"""
Tests for the Risk Identity Engine
===================================
Pure-function tests — no DB, no network, no API key required.
Run with:  python -m pytest tests/test_risk_identity.py -v
"""

import sys
import os

# Add the app directory to the path so we can import agents.risk_identity
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from agents.risk_identity import (
    tokens,
    jaccard,
    fingerprint,
    similarity,
    reconcile,
    MATCH_THRESHOLD,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Fingerprint tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestFingerprint:
    """Fingerprint must be deterministic and word-order-invariant."""

    def test_identical_risks_identical_fingerprint(self):
        r = {"title": "Missing unit tests", "category": "technical"}
        assert fingerprint(r) == fingerprint(r)

    def test_word_order_invariance(self):
        a = {"title": "Auth module missing tests", "category": "technical"}
        b = {"title": "Missing tests auth module", "category": "technical"}
        assert fingerprint(a) == fingerprint(b)

    def test_case_and_punctuation_invariance(self):
        a = {"title": "Auth Module: Missing Tests!", "category": "Technical"}
        b = {"title": "auth module missing tests", "category": "technical"}
        assert fingerprint(a) == fingerprint(b)

    def test_different_category_different_fingerprint(self):
        a = {"title": "Missing tests", "category": "technical"}
        b = {"title": "Missing tests", "category": "schedule"}
        assert fingerprint(a) != fingerprint(b)

    def test_fingerprint_is_16_hex_chars(self):
        fp = fingerprint({"title": "Some risk", "category": "technical"})
        assert len(fp) == 16
        assert all(c in "0123456789abcdef" for c in fp)

    def test_fingerprint_stable_across_calls(self):
        r = {"title": "Database migration risk", "category": "technical"}
        fp1 = fingerprint(r)
        fp2 = fingerprint(r)
        assert fp1 == fp2


# ═══════════════════════════════════════════════════════════════════════════════
# Similarity tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestSimilarity:
    """Token similarity must handle the rewording case correctly."""

    def test_rewording_above_threshold(self):
        """The worked example from the design: same risk, different words."""
        a = {
            "title": "Authentication module has no integration tests",
            "description": "The auth service lacks integration test coverage, "
                           "which increases regression risk.",
        }
        b = {
            "title": "Missing integration test coverage for the auth service",
            "description": "No integration tests exist for the authentication "
                           "module, risking regressions.",
        }
        assert similarity(a, b) >= MATCH_THRESHOLD

    def test_unrelated_risks_below_threshold(self):
        a = {
            "title": "Database migration may cause downtime",
            "description": "Schema changes require careful migration planning.",
        }
        b = {
            "title": "Front-end accessibility compliance gaps",
            "description": "WCAG 2.1 AA standards are not met.",
        }
        assert similarity(a, b) < MATCH_THRESHOLD

    def test_empty_titles_no_error(self):
        a = {"title": None, "description": "Something"}
        b = {"title": "", "description": "Something else"}
        # Should return a float without raising
        result = similarity(a, b)
        assert isinstance(result, float)

    def test_similarity_is_symmetric(self):
        a = {"title": "Risk alpha", "description": "Details alpha"}
        b = {"title": "Risk beta", "description": "Details beta"}
        assert similarity(a, b) == similarity(b, a)

    def test_pair_just_above_threshold_matches(self):
        """Engineer a pair that sits just above MATCH_THRESHOLD (0.25)."""
        a = {"title": "integration test coverage gaps", "description": "auth service lacks tests"}
        b = {"title": "integration test coverage missing", "description": "auth module lacks tests"}
        sim = similarity(a, b)
        assert sim >= MATCH_THRESHOLD

    def test_pair_just_below_threshold_does_not_match(self):
        """Engineer a pair with very low overlap."""
        a = {"title": "server deployment pipeline", "description": "CI/CD configuration"}
        b = {"title": "database schema migration", "description": "table restructuring plan"}
        sim = similarity(a, b)
        assert sim < MATCH_THRESHOLD


# ═══════════════════════════════════════════════════════════════════════════════
# Reconcile tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestReconcile:
    """End-to-end reconciliation logic."""

    def test_empty_existing_all_created(self):
        detected = [
            {"title": "Risk A", "description": "", "category": "technical", "source_context": None},
            {"title": "Risk B", "description": "", "category": "schedule", "source_context": None},
        ]
        result = reconcile([], detected)
        assert result["created"] == [0, 1]
        assert result["matched"] == []
        assert result["not_detected"] == []

    def test_empty_detected_all_not_detected(self):
        existing = [
            {"id": "e1", "fingerprint": "aaa", "title": "Risk A",
             "description": "", "category": "technical",
             "source_context": None, "status": "open"},
        ]
        result = reconcile(existing, [])
        assert result["not_detected"] == ["e1"]
        assert result["created"] == []
        assert result["matched"] == []

    def test_evidence_quote_match(self):
        """Same quote, completely different wording → matched via quote."""
        existing = [
            {"id": "e1", "fingerprint": "xxx", "title": "Old wording",
             "description": "Old desc", "category": "technical",
             "source_context": "the auth module is untested",
             "status": "open"},
        ]
        detected = [
            {"title": "Totally new wording here",
             "description": "New desc", "category": "technical",
             "source_context": "The auth module is untested"},
        ]
        result = reconcile(existing, detected)
        assert len(result["matched"]) == 1
        assert result["matched"][0]["signal"] == "quote"
        assert result["matched"][0]["existing_id"] == "e1"

    def test_cross_category_not_matched(self):
        """High lexical overlap but different categories → no match."""
        existing = [
            {"id": "e1", "fingerprint": fingerprint({"title": "Missing tests", "category": "technical"}),
             "title": "Missing tests", "description": "",
             "category": "technical", "source_context": None,
             "status": "open"},
        ]
        detected = [
            {"title": "Missing tests", "description": "",
             "category": "schedule", "source_context": None},
        ]
        result = reconcile(existing, detected)
        assert len(result["matched"]) == 0
        assert 0 in result["created"]

    def test_one_existing_cannot_be_claimed_twice(self):
        """Two detected risks similar to one existing → only one matches."""
        existing = [
            {"id": "e1",
             "fingerprint": fingerprint({"title": "Auth tests missing", "category": "technical"}),
             "title": "Auth tests missing", "description": "No integration tests for auth",
             "category": "technical", "source_context": None,
             "status": "open"},
        ]
        detected = [
            {"title": "Auth tests missing", "description": "No integration tests",
             "category": "technical", "source_context": None},
            {"title": "Auth tests missing too", "description": "Also no integration tests",
             "category": "technical", "source_context": None},
        ]
        result = reconcile(existing, detected)
        # Exactly one should match
        assert len(result["matched"]) == 1
        # The other should be created
        assert len(result["created"]) == 1

    def test_every_detected_in_exactly_one_bucket(self):
        """Every detected index appears in exactly one of matched or created."""
        existing = [
            {"id": "e1", "fingerprint": fingerprint({"title": "Risk one", "category": "technical"}),
             "title": "Risk one", "description": "",
             "category": "technical", "source_context": None,
             "status": "open"},
        ]
        detected = [
            {"title": "Risk one", "description": "", "category": "technical", "source_context": None},
            {"title": "Risk two", "description": "", "category": "schedule", "source_context": None},
            {"title": "Risk three", "description": "", "category": "scope", "source_context": None},
        ]
        result = reconcile(existing, detected)
        matched_idxs = {m["detected_index"] for m in result["matched"]}
        created_idxs = set(result["created"])
        all_idxs = set(range(len(detected)))

        # No overlap
        assert matched_idxs & created_idxs == set()
        # Complete coverage
        assert matched_idxs | created_idxs == all_idxs

    def test_resolved_not_in_not_detected(self):
        """Resolved/accepted risks should NOT appear in not_detected."""
        existing = [
            {"id": "e1", "fingerprint": "aaa", "title": "Old risk",
             "description": "", "category": "technical",
             "source_context": None, "status": "resolved"},
        ]
        result = reconcile(existing, [])
        assert "e1" not in result["not_detected"]
