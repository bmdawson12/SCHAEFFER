"""
fetchers.py — Retrieves document lists from RSS feeds and web pages.

Each fetcher returns a list of document dicts with these keys:
    title        (str)           — document title or link text
    url          (str)           — absolute URL
    publisher    (str)           — source name (e.g. "CBO")
    year         (int|None)      — publication year, None if unknown
    text_content (str)           — whatever text we have now (may be empty)
    is_pdf       (bool)          — True if the URL points to a PDF
    needs_fetch  (bool)          — True if the pipeline should download the full page
    source_id    (int|None)      — database ID of the Source row
    fingerprint  (str)           — dedup key (normalized URL hash)
"""

import hashlib
import re
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse, urlunparse

import feedparser
import httpx
from bs4 import BeautifulSoup

import logging
logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_pdf_url(url: str) -> bool:
    """Return True if this URL likely points to a PDF."""
    lower = url.lower()
    # Direct .pdf extension
    if lower.split("?")[0].endswith(".pdf"):
        return True
    # Query params that signal PDF output
    if "format=pdf" in lower or "type=pdf" in lower or "output=pdf" in lower:
        return True
    return False


def _normalize_url(url: str) -> str:
    """Remove fragments and sort query params for stable dedup comparison."""
    parsed = urlparse(url)
    # Drop fragment (#section), lowercase scheme+host
    normalized = urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        parsed.path,
        parsed.params,
        parsed.query,
        "",   # remove fragment
    ))
    return normalized


def make_fingerprint(url: str) -> str:
    """Return a short hash of the normalized URL — used for deduplication."""
    normalized = _normalize_url(url)
    return hashlib.md5(normalized.encode()).hexdigest()


def _extract_year(text: str) -> Optional[int]:
    """Pull the first 4-digit year (1990–2029) out of a string."""
    matches = re.findall(r"\b(20[012]\d|199\d)\b", text)
    if matches:
        return int(matches[0])
    return None


def _absolute_url(base_url: str, href: str) -> str:
    """Convert a relative href to an absolute URL using urljoin (handles ../  ./ etc.)."""
    return urljoin(base_url, href)


# ── Base class ─────────────────────────────────────────────────────────────────

class DocumentFetcher:
    def __init__(self, source_config: dict):
        self.cfg = source_config

    async def fetch(self) -> List[Dict]:
        raise NotImplementedError


# ── RSS Fetcher ────────────────────────────────────────────────────────────────

class RSSFetcher(DocumentFetcher):
    """
    Reads an RSS/Atom feed and returns one document per entry.
    The full document text is NOT fetched here — if the entry has no
    content, needs_fetch=True so the pipeline can download it later.
    """

    async def fetch(self) -> List[Dict]:
        url = self.cfg["url"]
        try:
            async with httpx.AsyncClient(timeout=30, headers=HEADERS) as client:
                resp = await client.get(url, follow_redirects=True)
                resp.raise_for_status()
            feed = feedparser.parse(resp.text)
        except Exception as e:
            logger.warning(f"[RSS] Failed to fetch {url}: {e}")
            return []

        documents = []
        for entry in feed.entries[:30]:
            # Try to get year from feed metadata
            year = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                year = entry.published_parsed.tm_year
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                year = entry.updated_parsed.tm_year

            # Combine summary + content blocks into one text chunk
            summary = entry.get("summary", "") or ""
            content_list = entry.get("content", []) or []
            content_text = " ".join(c.get("value", "") for c in content_list)
            combined_text = f"{summary} {content_text}".strip()

            entry_url = entry.get("link", "").strip()
            if not entry_url:
                continue  # skip entries with no URL

            is_pdf = _is_pdf_url(entry_url)

            documents.append({
                "title": entry.get("title", "").strip(),
                "url": entry_url,
                "publisher": self.cfg["name"],
                "year": year,
                # PDFs have no text yet; empty HTML entries need a fetch
                "text_content": combined_text if not is_pdf else "",
                "is_pdf": is_pdf,
                "needs_fetch": is_pdf or not combined_text,
                "source_id": self.cfg.get("db_id"),
                "fingerprint": make_fingerprint(entry_url),
            })

        return documents


# ── Web Scraper ────────────────────────────────────────────────────────────────

class WebScraper(DocumentFetcher):
    """
    Loads a page and returns one document per link found on that page.
    For PDF links: marks is_pdf=True, no text yet.
    For HTML links: records any anchor text as a hint, sets needs_fetch=True.
    Does NOT follow links — that is the deep_scraper's job.
    """

    async def fetch(self) -> List[Dict]:
        url = self.cfg["url"]
        config = self.cfg.get("config", {})

        # CSS selector for links — default catches all anchors
        link_selector = config.get("link_selector", "a[href]")

        try:
            async with httpx.AsyncClient(
                timeout=30, headers=HEADERS, follow_redirects=True
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
        except Exception as e:
            logger.warning(f"[Scrape] Failed to fetch {url}: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        documents = []
        seen_fingerprints = set()

        for item in soup.select(link_selector)[:40]:
            href = (item.get("href") or "").strip()

            # Skip empty, in-page anchors, and mailto links
            if not href or href.startswith("#") or href.startswith("mailto:"):
                continue

            # Resolve relative URLs correctly (handles ../ ./ and root-relative)
            abs_url = _absolute_url(url, href)

            # Only keep http/https URLs
            if not abs_url.startswith("http"):
                continue

            fp = make_fingerprint(abs_url)
            if fp in seen_fingerprints:
                continue
            seen_fingerprints.add(fp)

            # Anchor text is a title hint; also try title attribute
            anchor_text = item.get_text(separator=" ", strip=True)
            title_attr = item.get("title", "").strip()
            title = anchor_text or title_attr or abs_url

            # Try to pull a year from anchor text + URL
            year = _extract_year(anchor_text + " " + abs_url)

            is_pdf = _is_pdf_url(abs_url)

            documents.append({
                "title": title[:500],
                "url": abs_url,
                "publisher": self.cfg["name"],
                "year": year,  # None if not found — never guess
                # PDFs have no text; HTML pages have only anchor text (shallow)
                "text_content": anchor_text if not is_pdf else "",
                "is_pdf": is_pdf,
                # HTML pages need their full content fetched later for name matching
                "needs_fetch": True,
                "source_id": self.cfg.get("db_id"),
                "fingerprint": fp,
            })

        return documents


# ── Factory ────────────────────────────────────────────────────────────────────

def get_fetcher(source_config: dict) -> DocumentFetcher:
    if source_config.get("source_type") == "rss":
        return RSSFetcher(source_config)
    return WebScraper(source_config)
