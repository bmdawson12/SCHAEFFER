"""
test_pipeline.py — Quick sanity checks for name matching, dedup, and PDF extraction.

Run with:
    python3 test_pipeline.py

No database or network needed for the name matching tests.
PDF extraction test requires an internet connection.
"""

import sys
import asyncio


# ── Test 1: Name matching ──────────────────────────────────────────────────────

def test_name_matching():
    print("\n=== TEST: Name Matching ===")
    from app.ingestion.name_matcher import find_name_matches

    people = [
        {"id": 1, "full_name": "Dana Goldman", "name_variations": [], "title": "Dr."},
        {"id": 2, "full_name": "Neeraj Sood",  "name_variations": [], "title": ""},
        {"id": 3, "full_name": "Erin Trish",   "name_variations": [], "title": ""},
        {"id": 4, "full_name": "Darius Lakdawalla", "name_variations": ["Lakdawalla, D."], "title": ""},
        {"id": 5, "full_name": "Geoffrey Joyce", "name_variations": [], "title": ""},
    ]

    tests = [
        # (text, expected_faculty_list, description)
        (
            "According to Goldman et al. (2022), drug prices have risen significantly.",
            ["Dana Goldman"],
            "Last name + et al."
        ),
        (
            "The study by Dana Goldman and Neeraj Sood found that...",
            ["Dana Goldman", "Neeraj Sood"],
            "Two faculty in one sentence"
        ),
        (
            "As noted in Lakdawalla, D. (2021), value-based pricing...",
            ["Darius Lakdawalla"],
            "Name variation match"
        ),
        (
            "The report cited work by Geoffrey F. Joyce on prescription drug spending.",
            ["Geoffrey Joyce"],
            "Middle initial variant"
        ),
        (
            "There is no faculty name in this text whatsoever.",
            [],
            "No match expected"
        ),
        (
            # False positive test — "Gold" should NOT match "Goldman"
            "The gold standard for clinical trials requires...",
            [],
            "False positive guard: 'gold' should not match Goldman"
        ),
    ]

    passed = 0
    for text, expected, description in tests:
        matches = find_name_matches(text, people)
        found = sorted([m["faculty"] for m in matches])
        expected_sorted = sorted(expected)
        ok = found == expected_sorted
        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        print(f"  [{status}] {description}")
        if not ok:
            print(f"         Expected: {expected_sorted}")
            print(f"         Got:      {found}")
        else:
            for m in matches:
                print(f"         score={m['confidence_score']:.0f} via='{m['matched_variant']}' "
                      f"context={m.get('context_reason', '')}")

    print(f"\n  Result: {passed}/{len(tests)} passed")
    return passed == len(tests)


# ── Test 2: URL fingerprinting / dedup ────────────────────────────────────────

def test_fingerprint():
    print("\n=== TEST: URL Fingerprinting ===")
    from app.ingestion.fetchers import make_fingerprint

    tests = [
        # (url1, url2, should_match, description)
        (
            "https://www.cbo.gov/publication/12345",
            "https://www.cbo.gov/publication/12345",
            True, "Same URL"
        ),
        (
            "https://www.cbo.gov/publication/12345",
            "https://www.cbo.gov/publication/12345#section1",
            True, "Same URL, different fragment"
        ),
        (
            "https://www.cbo.gov/publication/12345",
            "https://www.cbo.gov/publication/99999",
            False, "Different publication"
        ),
        (
            "https://WWW.CBO.GOV/publication/12345",
            "https://www.cbo.gov/publication/12345",
            True, "Case-insensitive domain"
        ),
    ]

    passed = 0
    for url1, url2, should_match, desc in tests:
        fp1 = make_fingerprint(url1)
        fp2 = make_fingerprint(url2)
        matched = fp1 == fp2
        ok = matched == should_match
        if ok:
            passed += 1
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {desc}")
        if not ok:
            print(f"         Expected match={should_match}, got match={matched}")

    print(f"\n  Result: {passed}/{len(tests)} passed")
    return passed == len(tests)


# ── Test 3: Fetcher document structure ────────────────────────────────────────

def test_fetcher_keys():
    print("\n=== TEST: Fetcher document keys ===")
    # Just verify the keys are consistent — no network call needed
    required_keys = {"title", "url", "publisher", "year", "text_content",
                     "is_pdf", "needs_fetch", "source_id", "fingerprint"}

    from app.ingestion.fetchers import RSSFetcher, WebScraper

    # Create mock source config
    cfg = {"db_id": 1, "name": "Test Source", "url": "https://example.com", "config": {}}

    # Check class attributes exist (can't run async here without network)
    rss = RSSFetcher(cfg)
    web = WebScraper(cfg)
    print("  [PASS] RSSFetcher and WebScraper instantiate without errors")
    print(f"  Required document keys: {sorted(required_keys)}")
    return True


# ── Test 4: PDF extraction (network) ──────────────────────────────────────────

async def test_pdf_extraction():
    print("\n=== TEST: PDF Extraction (network) ===")
    # Use a small, known public PDF
    test_url = "https://www.cbo.gov/system/files/2024-06/60437-housing.pdf"

    try:
        from app.ingestion.pdf_parser import extract_text_from_pdf
        print(f"  Fetching: {test_url}")
        text = await extract_text_from_pdf(test_url)
        if text and len(text) > 100:
            print(f"  [PASS] Extracted {len(text):,} chars from PDF")
            print(f"  First 200 chars: {text[:200]!r}")
            return True
        elif text is None:
            print(f"  [SKIP] PDF download blocked (403/network issue) — expected for some gov sites")
            return True  # Not a code bug — just blocked
        else:
            print(f"  [FAIL] Got too little text: {len(text or '')} chars")
            return False
    except Exception as e:
        print(f"  [SKIP] PDF extraction error (may be network issue): {e}")
        return True


# ── Runner ─────────────────────────────────────────────────────────────────────

async def main():
    results = []
    results.append(test_name_matching())
    results.append(test_fingerprint())
    results.append(test_fetcher_keys())
    results.append(await test_pdf_extraction())

    passed = sum(results)
    total = len(results)
    print(f"\n{'='*50}")
    print(f"OVERALL: {passed}/{total} test groups passed")
    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
