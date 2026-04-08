from rapidfuzz import fuzz
from typing import List, Dict
import re
import logging

logger = logging.getLogger(__name__)

FUZZY_THRESHOLD = 88  # minimum score (0–100) to count as a match


def _normalize(name: str) -> str:
    """Lowercase, strip honorifics and punctuation."""
    name = name.lower().strip()
    # Remove common titles
    for title in (
        r"\bdr\.?\b", r"\bprof\.?\b", r"\bmr\.?\b", r"\bms\.?\b",
        r"\bmrs\.?\b", r"\bphd\b", r"\bph\.d\.?\b", r"\bm\.d\.?\b",
        r"\bmd\b", r"\bj\.d\.?\b", r"\bjd\b", r"\besq\.?\b",
    ):
        name = re.sub(title, "", name)
    return re.sub(r"\s+", " ", name).strip()


def _build_variants(person: dict) -> List[str]:
    """Return all name strings we should search for."""
    variants = set()
    full = person["full_name"]
    variants.add(full)

    for v in person.get("name_variations") or []:
        if v.strip():
            variants.add(v.strip())

    parts = full.split()
    if len(parts) >= 2:
        first, last = parts[0], parts[-1]
        variants.add(f"{first} {last}")
        variants.add(f"{first[0]}. {last}")
        variants.add(f"{first[0]} {last}")
        variants.add(f"{last}, {first}")
        variants.add(f"{last}, {first[0]}.")
        title = (person.get("title") or "").strip()
        if title:
            variants.add(f"{title} {first} {last}")
            variants.add(f"{title} {last}")

    return [v for v in variants if len(v) >= 4]


def _context_around(text: str, idx: int, span: int, window: int = 300) -> str:
    start = max(0, idx - window)
    end = min(len(text), idx + span + window)
    return text[start:end]


def find_name_matches(text: str, people: List[dict]) -> List[Dict]:
    """
    Search *text* for mentions of any person in *people*.
    Returns a list of match dicts for each unique person found.
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
        best = None

        for variant in variants:
            v_lower = _normalize(variant)
            if not v_lower:
                continue

            # 1) Fast exact substring check
            idx = text_lower.find(v_lower)
            if idx != -1:
                best = {
                    "person_id": person["id"],
                    "faculty": person["full_name"],
                    "matched_variant": variant,
                    "confidence_score": 100.0,
                    "matched_text": _context_around(text, idx, len(v_lower)),
                }
                break

            # 2) Fuzzy sliding window (only for longer names to avoid false positives)
            if len(v_lower) < 8:
                continue

            words = text_lower.split()
            v_words = v_lower.split()
            win = len(v_words) + 1

            for i in range(len(words) - len(v_words) + 1):
                window_str = " ".join(words[i : i + win])
                score = fuzz.token_sort_ratio(v_lower, window_str)
                if score >= FUZZY_THRESHOLD:
                    raw_idx = text_lower.find(words[i])
                    ctx = _context_around(text, raw_idx if raw_idx != -1 else 0, len(window_str))
                    if best is None or score > best["confidence_score"]:
                        best = {
                            "person_id": person["id"],
                            "faculty": person["full_name"],
                            "matched_variant": variant,
                            "confidence_score": float(score),
                            "matched_text": ctx,
                        }

        if best:
            matches.append(best)
            matched_ids.add(person["id"])

    return matches
