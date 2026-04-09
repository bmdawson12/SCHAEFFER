"""
name_matcher.py — Finds USC Schaeffer faculty mentions in a block of text.

Returns one match dict per person found, with:
    person_id       (int)   — database ID of the Person
    faculty         (str)   — Person's full_name
    matched_variant (str)   — which name variant triggered the match
    confidence_score (float) — 0–100, boosted by context signals
    matched_text    (str)   — ~300 char snippet around the match
    context_reason  (str)   — human-readable explanation of the score
"""

import re
from typing import List, Dict, Optional

from rapidfuzz import fuzz

import logging
logger = logging.getLogger(__name__)

# ── Thresholds ─────────────────────────────────────────────────────────────────
# Base fuzzy match threshold.
# Short names (< 8 chars) require a higher threshold to reduce false positives
# because a common word like "Gold" would match "Goldman" too easily.
FUZZY_THRESHOLD_LONG = 88   # for full names and long variants (>= 8 chars)
FUZZY_THRESHOLD_SHORT = 95  # for short name variants (< 8 chars) — near-exact only

# Context signals that raise confidence that this is a real citation
CITATION_CONTEXT_PATTERNS = [
    (r"\bet al\.?",                  5,  "et al."),
    (r"\bcited\b",                   5,  "cited"),
    (r"\bstudy\b",                   3,  "study"),
    (r"\bpaper\b",                   3,  "paper"),
    (r"\breport\b",                  3,  "report"),
    (r"\bresearch\b",                 3,  "research"),
    (r"\banalysis\b",                 3,  "analysis"),
    (r"\bfindings?\b",               3,  "findings"),
    (r"\bauthor[s]?\b",              5,  "author"),
    (r"\(20\d{2}\)",                 4,  "year in parens"),
    (r"\(19\d{2}\)",                 4,  "year in parens"),
    (r"\bschaeffer\b",               8,  "Schaeffer Center"),
    (r"\busc\b",                     5,  "USC"),
    (r"\buniversity of southern\b",  5,  "USC full name"),
    (r"\bheath economics?\b",         3,  "health economics"),
    (r"\bhealth policy\b",           3,  "health policy"),
]

# Common single-word names that might match noise — require exact match only
# (These are last names that appear in non-citation contexts frequently)
COMMON_SHORT_NAMES = {
    "gold", "song", "lee", "kim", "park", "chen", "wang", "zhang",
    "li", "wu", "lin", "yang", "sun", "lu", "he", "hu",
}


# ── Text normalization ─────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Lowercase, remove honorifics and extra whitespace."""
    text = text.lower().strip()
    # Strip common titles (Dr., Prof., Mr., etc.)
    for pattern in (
        r"\bdr\.?\s*", r"\bprof\.?\s*", r"\bmr\.?\s*", r"\bms\.?\s*",
        r"\bmrs\.?\s*", r"\bphd\b", r"\bph\.d\.?\b", r"\bm\.d\.?\b",
        r"\bmd\b", r"\bj\.d\.?\b", r"\bjd\b", r"\besq\.?\b",
    ):
        text = re.sub(pattern, "", text)
    return re.sub(r"\s+", " ", text).strip()


# ── Name variant generation ────────────────────────────────────────────────────

def _build_variants(person: dict) -> List[dict]:
    """
    Return all name strings we should look for, each tagged with a min threshold.
    Longer variants (full name, "First Last") use the relaxed fuzzy threshold.
    Short variants (initials, single word) use the tight threshold.
    """
    seen = set()
    variants = []

    def add(v: str, threshold: int):
        v = v.strip()
        if v and v not in seen and len(v) >= 3:
            seen.add(v)
            variants.append({"variant": v, "threshold": threshold})

    full = person["full_name"]
    parts = full.split()

    # Full name — use relaxed threshold
    add(full, FUZZY_THRESHOLD_LONG)

    # Custom variations stored in the database
    for v in person.get("name_variations") or []:
        if v.strip():
            length = len(v.strip().replace(" ", ""))
            t = FUZZY_THRESHOLD_LONG if length >= 8 else FUZZY_THRESHOLD_SHORT
            add(v.strip(), t)

    if len(parts) >= 2:
        first, last = parts[0], parts[-1]

        # Last name alone — common in "Goldman et al." style citations.
        # Use tight threshold for short last names, relaxed for longer ones.
        # Skip very common single words.
        if last.lower() not in COMMON_SHORT_NAMES:
            add(last, FUZZY_THRESHOLD_LONG if len(last) >= 6 else FUZZY_THRESHOLD_SHORT)

        # "First Last" — relaxed if combined length is long enough
        fl = f"{first} {last}"
        add(fl, FUZZY_THRESHOLD_LONG if len(fl) >= 8 else FUZZY_THRESHOLD_SHORT)

        # "Last, First" — e.g. "Goldman, Dana"
        add(f"{last}, {first}", FUZZY_THRESHOLD_LONG)

        # "F. Last" — initial + last name — requires tight threshold for short last names
        fi_last = f"{first[0]}. {last}"
        add(fi_last, FUZZY_THRESHOLD_LONG if len(last) >= 5 else FUZZY_THRESHOLD_SHORT)

        # "F Last" — no period
        add(f"{first[0]} {last}", FUZZY_THRESHOLD_SHORT if len(last) < 5 else FUZZY_THRESHOLD_LONG)

        # "Last, F." — common in reference lists
        add(f"{last}, {first[0]}.", FUZZY_THRESHOLD_LONG if len(last) >= 5 else FUZZY_THRESHOLD_SHORT)

        # With title prefix (if stored) — e.g. "Dr. Goldman"
        title = (person.get("title") or "").strip()
        if title:
            add(f"{title} {first} {last}", FUZZY_THRESHOLD_LONG)

    return variants


# ── Context scoring ────────────────────────────────────────────────────────────

def _score_context(context: str) -> tuple:
    """
    Look for citation-related words near the match.
    Returns (boost: int, reasons: list[str]).
    """
    ctx_lower = context.lower()
    boost = 0
    reasons = []

    for pattern, points, label in CITATION_CONTEXT_PATTERNS:
        if re.search(pattern, ctx_lower):
            boost += points
            reasons.append(label)

    return boost, reasons


# ── Single-name validation ─────────────────────────────────────────────────
# When we match a lone last name (e.g. "Simon"), it could be anyone.
# We require corroborating evidence nearby to treat it as a real match.

INSTITUTION_SIGNALS = [
    r"\bschaeffer\b", r"\busc\b", r"\buniversity of southern california\b",
    r"\brand\b", r"\bnber\b", r"\bbrookings\b",
]

def _validate_single_name_match(text_lower: str, match_idx: int, person: dict) -> tuple:
    """
    For single-word last name matches, look for corroborating evidence nearby:
      - First name or initial within 100 chars
      - Institutional affiliation within 200 chars
      - "et al." within 30 chars after the name

    Returns (is_valid: bool, reason: str).
    """
    parts = person["full_name"].split()
    if len(parts) < 2:
        return False, "no first name to validate against"

    first = parts[0].lower()
    first_initial = first[0]

    # Check a window of 100 chars before and after the match
    window_start = max(0, match_idx - 100)
    window_end = min(len(text_lower), match_idx + 100)
    nearby = text_lower[window_start:window_end]

    # Check for first name nearby (e.g. "Kosali" near "Simon")
    if re.search(r"\b" + re.escape(first) + r"\b", nearby):
        return True, "first name nearby"

    # Check for first initial pattern (e.g. "K. Simon" or "K Simon")
    if re.search(r"\b" + re.escape(first_initial) + r"\.?\s", nearby):
        return True, "initial nearby"

    # Check for "et al." right after the name (within 30 chars)
    after_name = text_lower[match_idx:min(len(text_lower), match_idx + 40)]
    if re.search(r"\bet\s+al\.?", after_name):
        return True, "et al."

    # Check for institutional signals in a wider window (200 chars)
    wide_start = max(0, match_idx - 200)
    wide_end = min(len(text_lower), match_idx + 200)
    wide_nearby = text_lower[wide_start:wide_end]
    for pattern in INSTITUTION_SIGNALS:
        if re.search(pattern, wide_nearby):
            return True, "institutional context"

    return False, "no corroborating evidence"


# ── Snippet extraction ─────────────────────────────────────────────────────────

def _snippet(text: str, idx: int, match_len: int, window: int = 300) -> str:
    """Extract ~300 chars around position idx in text."""
    start = max(0, idx - window)
    end = min(len(text), idx + match_len + window)
    snippet = text[start:end].strip()
    # Add ellipsis if we cut the text
    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet = snippet + "…"
    return snippet


# ── Main matching function ─────────────────────────────────────────────────────

def find_name_matches(text: str, people: List[dict]) -> List[Dict]:
    """
    Search *text* for mentions of any person in *people*.

    Returns one match dict per person (the best-scoring variant wins).
    Each match dict has: person_id, faculty, matched_variant, confidence_score,
                         matched_text, context_reason.
    """
    if not text or not people:
        return []

    text_lower = text.lower()
    matches = []
    matched_ids: set = set()

    for person in people:
        if person["id"] in matched_ids:
            continue

        variants = _build_variants(person)
        best: Optional[Dict] = None

        for vd in variants:
            variant = vd["variant"]
            threshold = vd["threshold"]
            v_lower = _normalize(variant)

            if not v_lower or len(v_lower) < 3:
                continue

            # Skip single-word common names entirely to avoid noise
            if " " not in v_lower and v_lower in COMMON_SHORT_NAMES:
                continue

            # ── Pass 1: whole-word exact match ────────────────────────────────
            # Use \b word boundaries so "Rice" doesn't match "p*rice*s".
            m = re.search(r"\b" + re.escape(v_lower) + r"\b", text_lower)
            if m:
                idx = m.start()

                # If this is a single-word variant (just a last name), require
                # corroborating evidence nearby to avoid matching random people
                # named "Simon" or "Barnes" who aren't our faculty.
                is_single_word = " " not in v_lower and "." not in v_lower
                if is_single_word:
                    valid, val_reason = _validate_single_name_match(
                        text_lower, idx, person
                    )
                    if not valid:
                        # Skip this variant — try longer variants instead
                        continue

                ctx = _snippet(text, idx, len(v_lower))
                boost, reasons = _score_context(ctx)
                if is_single_word:
                    # Single-word matches start at 90 (not 100) to reflect
                    # the inherent uncertainty of matching just a last name
                    score = min(99.0, 90.0 + boost)
                    reasons.append(val_reason)
                else:
                    score = min(100.0, 100.0 + boost)

                candidate = {
                    "person_id": person["id"],
                    "faculty": person["full_name"],
                    "matched_variant": variant,
                    "confidence_score": score,
                    "matched_text": ctx,
                    "context_reason": ", ".join(reasons) if reasons else "exact match",
                }
                # Exact whole-word match wins — no need to check other variants
                best = candidate
                break

            # ── Pass 2: fuzzy sliding window ────────────────────────────────
            # Only use fuzzy for multi-word variants (reduces false positives).
            # Single words are only matched via exact substring (Pass 1 above).
            v_words = v_lower.split()
            if len(v_words) < 2:
                continue

            words = text_lower.split()
            # Slide a window of the same word count (+1 for flexibility)
            win_size = len(v_words) + 1

            for i in range(max(0, len(words) - len(v_words) + 1)):
                window_str = " ".join(words[i : i + win_size])
                score = fuzz.token_sort_ratio(v_lower, window_str)

                if score < threshold:
                    continue

                # Find where this window starts in the original text
                anchor_word = words[i]
                raw_idx = text_lower.find(anchor_word, max(0, i * 3 - 10))
                ctx = _snippet(text, raw_idx if raw_idx != -1 else 0, len(window_str))

                boost, reasons = _score_context(ctx)
                final_score = min(99.0, float(score) + boost)  # cap at 99 (not exact)

                if best is None or final_score > best["confidence_score"]:
                    best = {
                        "person_id": person["id"],
                        "faculty": person["full_name"],
                        "matched_variant": variant,
                        "confidence_score": final_score,
                        "matched_text": ctx,
                        "context_reason": ", ".join(reasons) if reasons else "fuzzy match",
                    }

        if best:
            matches.append(best)
            matched_ids.add(person["id"])
            logger.debug(
                f"  Matched: {best['faculty']} via '{best['matched_variant']}' "
                f"score={best['confidence_score']:.1f} ({best['context_reason']})"
            )

    return matches
