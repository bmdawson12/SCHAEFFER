import feedparser
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CitationMonitor/1.0; "
        "+https://github.com/citation-monitor)"
    )
}


class DocumentFetcher:
    def __init__(self, source_config: dict):
        self.cfg = source_config

    async def fetch(self) -> List[Dict]:
        raise NotImplementedError


class RSSFetcher(DocumentFetcher):
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
            year = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                year = entry.published_parsed.tm_year
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                year = entry.updated_parsed.tm_year

            summary = entry.get("summary", "")
            content_list = entry.get("content", [])
            content_text = " ".join(c.get("value", "") for c in content_list) if content_list else ""

            documents.append({
                "title": entry.get("title", "").strip(),
                "url": entry.get("link", ""),
                "publisher": self.cfg["name"],
                "year": year,
                "text_content": f"{summary} {content_text}".strip(),
                "source_id": self.cfg.get("db_id"),
            })

        return documents


class WebScraper(DocumentFetcher):
    async def fetch(self) -> List[Dict]:
        url = self.cfg["url"]
        config = self.cfg.get("config", {})
        link_selector = config.get("link_selector", "a[href]")

        try:
            async with httpx.AsyncClient(timeout=30, headers=HEADERS, follow_redirects=True) as client:
                resp = await client.get(url)
                resp.raise_for_status()
        except Exception as e:
            logger.warning(f"[Scrape] Failed to fetch {url}: {e}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        documents = []
        seen_urls = set()

        base = _base_url(url)
        items = soup.select(link_selector)

        for item in items[:25]:
            href = item.get("href", "").strip()
            if not href or href.startswith("#") or href.startswith("mailto:"):
                continue
            if not href.startswith("http"):
                href = base + "/" + href.lstrip("/")
            if href in seen_urls:
                continue
            seen_urls.add(href)

            text = item.get_text(separator=" ", strip=True)
            year = _extract_year(text + " " + href)

            documents.append({
                "title": text[:500] if text else href,
                "url": href,
                "publisher": self.cfg["name"],
                "year": year or datetime.now().year,
                "text_content": text,
                "source_id": self.cfg.get("db_id"),
            })

        return documents


def _base_url(url: str) -> str:
    parts = url.split("/")
    return parts[0] + "//" + parts[2]


def _extract_year(text: str) -> Optional[int]:
    matches = re.findall(r"\b(20\d{2}|19\d{2})\b", text)
    if matches:
        return int(matches[0])
    return None


def get_fetcher(source_config: dict) -> DocumentFetcher:
    if source_config.get("source_type") == "rss":
        return RSSFetcher(source_config)
    return WebScraper(source_config)
