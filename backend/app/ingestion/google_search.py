"""
Google Search integration for finding faculty citations in government publications.

Searches Google for each tracked person's name combined with government site
domains, parses result URLs, then fetches and scans the linked documents.
"""

import asyncio
import httpx
import re
import logging
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs, unquote

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Government domains grouped for efficient batched queries
GOV_SITE_GROUPS = [
    # Federal agencies with publications
    [
        "cbo.gov", "gao.gov", "medpac.gov", "treasury.gov",
        "hhs.gov", "irs.gov", "fda.gov", "ftc.gov",
    ],
    # NIH / Academies / White House
    [
        "nia.nih.gov", "nih.gov", "nam.edu", "nasonline.org",
        "whitehouse.gov", "congress.gov",
    ],
    # Congressional committees
    [
        "energycommerce.house.gov", "judiciary.house.gov",
        "waysandmeans.house.gov", "oversight.house.gov",
        "finance.senate.gov", "help.senate.gov",
        "aging.senate.gov", "budget.senate.gov",
    ],
    # State & local
    [
        "leginfo.legislature.ca.gov", "chbrp.ucdavis.edu",
        "publichealth.lacounty.gov", "legis.delaware.gov",
        "illinois.gov", "nh.gov",
    ],
]


def _build_query(person_name: str, sites: List[str]) -> str:
    """Build a Google search query for a person across multiple gov sites."""
    site_clause = " OR ".join(f"site:{s}" for s in sites)
    # Use last name for broader matching, full name in quotes for precision
    parts = person_name.split()
    last_name = parts[-1] if parts else person_name
    return f'"{last_name}" ({site_clause})'


def _extract_google_urls(html: str) -> List[str]:
    """Extract result URLs from Google search results HTML."""
    soup = BeautifulSoup(html, "lxml")
    urls = []

    # Method 1: parse <a> tags with /url?q= hrefs (Google redirect links)
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if "/url?q=" in href:
            parsed = parse_qs(urlparse(href).query)
            real_url = parsed.get("q", [None])[0]
            if real_url and not real_url.startswith("https://accounts.google"):
                urls.append(unquote(real_url))

    # Method 2: look for direct links to gov domains
    for a in soup.select("a[href^='http']"):
        href = a.get("href", "")
        if any(domain in href for group in GOV_SITE_GROUPS for domain in group):
            if href not in urls:
                urls.append(href)

    return urls


async def _fetch_page_text(client: httpx.AsyncClient, url: str) -> Optional[str]:
    """Fetch a web page and extract its text content."""
    try:
        resp = await client.get(url, follow_redirects=True, timeout=20)
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "")
        if "pdf" in content_type:
            return None  # PDFs handled separately by the pipeline

        soup = BeautifulSoup(resp.text, "lxml")
        # Remove nav, header, footer, script, style
        for tag in soup.select("nav, header, footer, script, style, aside"):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)
    except Exception as e:
        logger.debug(f"Failed to fetch {url}: {e}")
        return None


async def search_google_for_person(
    person: dict,
    client: httpx.AsyncClient,
) -> List[Dict]:
    """
    Search Google for a person's name across government sites.
    Returns list of document dicts with title, url, publisher, text_content.
    """
    documents = []
    seen_urls: set = set()
    name = person["full_name"]

    for site_group in GOV_SITE_GROUPS:
        query = _build_query(name, site_group)
        search_url = f"https://www.google.com/search?q={query}&num=15"

        try:
            resp = await client.get(search_url, headers=HEADERS, follow_redirects=True, timeout=15)
            if resp.status_code == 429:
                logger.warning("Google rate limit hit, backing off")
                await asyncio.sleep(30)
                continue
            if resp.status_code != 200:
                continue

            result_urls = _extract_google_urls(resp.text)
            logger.info(f"Google [{name}] group {site_group[0]}...: {len(result_urls)} results")

            for url in result_urls[:10]:
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                # Determine publisher from domain
                domain = urlparse(url).netloc.replace("www.", "")
                is_pdf = url.lower().endswith(".pdf")

                documents.append({
                    "title": f"Google result for {name}",
                    "url": url,
                    "publisher": domain,
                    "year": None,
                    "text_content": "",  # Will be fetched by pipeline
                    "is_pdf": is_pdf,
                    "source_id": None,
                    "needs_fetch": True,
                })

        except Exception as e:
            logger.warning(f"Google search failed for [{name}] {site_group[0]}: {e}")

        # Rate limit: wait between queries to avoid blocks
        await asyncio.sleep(2)

    return documents


async def run_google_search(people: List[dict]) -> List[Dict]:
    """
    Run Google searches for all tracked people.
    Returns a flat list of discovered document dicts.
    """
    all_docs = []

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:
        for i, person in enumerate(people):
            logger.info(f"Google search {i+1}/{len(people)}: {person['full_name']}")
            docs = await search_google_for_person(person, client)
            all_docs.extend(docs)

            # Pace requests to avoid Google blocks
            if (i + 1) % 5 == 0:
                await asyncio.sleep(5)

    logger.info(f"Google search complete: {len(all_docs)} total documents found")
    return all_docs
