"""
deep_scraper.py — Follows links within high-value government sources to find
full documents (HTML pages and PDFs) for name-matching.

Based on analysis of 440 historical citations, the top sources are:
  1. White House/CEA (57 citations) — wp-content/uploads/ PDFs
  2. CBO            (55 citations) — sites/default/files/ PDFs + /publication/ pages
  3. FTC            (31 citations) — system/files/ftc_gov/pdf/ PDFs
  4. MedPAC         (28 citations) — docs/default-source/reports/ PDFs
  5. NAS/NAM        (22 citations) — nationalacademies.org
  6. Energy & Commerce (30)        — energycommerce.house.gov/sites/.../files/documents/
  7. Senate Finance (30 citations) — finance.senate.gov/imo/media/doc/ PDFs
  8. GAO             (8 citations) — gao.gov/assets/ PDFs
  9. Senate Aging   (12 citations) — aging.senate.gov/imo/media/doc/ PDFs
 10. HHS/ASPE       (11 citations) — aspe.hhs.gov/reports
 11. Senate HELP     (9 citations) — help.senate.gov/hearings
 12. JEC            (15 citations) — jec.senate.gov

Each DEEP_CONFIG entry tells the scraper:
  start_urls      — pages to begin crawling from
  link_patterns   — regex patterns for links worth following
  max_pages       — how many pages to visit before stopping
"""

import asyncio
import re
import logging
from typing import List, Dict, Set, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from .fetchers import make_fingerprint

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


# ── Per-source deep scrape configurations ─────────────────────────────────────
# Keyed by domain substring (matched against the source URL's netloc).
# Patterns are matched against the full absolute URL of each link found.

DEEP_CONFIGS = {

    # ── CBO (Congressional Budget Office) ─────────────────────────────────
    # Publications live at /sites/default/files/ as PDFs,
    # and as HTML at /publication/XXXXX
    "cbo.gov": {
        "start_urls": [
            "https://www.cbo.gov/publications",
            "https://www.cbo.gov/cost-estimates",
        ],
        "link_patterns": [
            r"/publication/\d+",
            r"/sites/default/files/.*\.pdf",
            r"cbo\.gov/system/files/",
        ],
        "max_pages": 60,
    },

    # ── White House / Council of Economic Advisors ─────────────────────────
    # PDFs under /wp-content/uploads/YEAR/ and CEA written materials page
    "whitehouse.gov": {
        "start_urls": [
            "https://www.whitehouse.gov/cea/written-materials/",
            "https://www.whitehouse.gov/briefing-room/",
        ],
        "link_patterns": [
            r"/wp-content/uploads/\d{4}/.*\.pdf",
            r"/cea/written-materials/",
            r"/briefing-room/presidential-actions/",
            r"/briefing-room/statements-releases/",
        ],
        "max_pages": 40,
    },

    # ── FTC (Federal Trade Commission) ────────────────────────────────────
    # Reports and policy statements as PDFs under /system/files/ftc_gov/pdf/
    "ftc.gov": {
        "start_urls": [
            "https://www.ftc.gov/reports",
            "https://www.ftc.gov/policy/studies",
            "https://www.ftc.gov/news-events/news/press-releases",
        ],
        "link_patterns": [
            r"/system/files/ftc_gov/pdf/.*\.pdf",
            r"/system/files/documents/.*\.pdf",
            r"/reports/",
            r"/policy/",
        ],
        "max_pages": 40,
    },

    # ── MedPAC ────────────────────────────────────────────────────────────
    # Biannual "Reports to Congress" and testimony PDFs
    "medpac.gov": {
        "start_urls": [
            "https://www.medpac.gov/document-type/reports/",
            "https://www.medpac.gov/document-type/testimony/",
        ],
        "link_patterns": [
            r"/docs/default-source/reports/.*\.pdf",
            r"/docs/default-source/.*\.pdf",
            r"/document-type/",
        ],
        "max_pages": 30,
    },

    # ── GAO (Government Accountability Office) ────────────────────────────
    "gao.gov": {
        "start_urls": [
            "https://www.gao.gov/reports-testimonies",
        ],
        "link_patterns": [
            r"/assets/\d+/.*\.pdf",
            r"/products/GAO-",
        ],
        "max_pages": 40,
    },

    # ── Senate Finance Committee ───────────────────────────────────────────
    # PDFs go to /imo/media/doc/ — this is the most common pattern
    "finance.senate.gov": {
        "start_urls": [
            "https://www.finance.senate.gov/hearings",
            "https://www.finance.senate.gov/legislation",
            "https://www.finance.senate.gov/reports",
        ],
        "link_patterns": [
            r"/imo/media/doc/.*\.pdf",
            r"/hearings/",
            r"/legislation/",
        ],
        "max_pages": 30,
    },

    # ── House Energy & Commerce Committee ─────────────────────────────────
    # PDFs under /sites/.../files/documents/
    "energycommerce.house.gov": {
        "start_urls": [
            "https://energycommerce.house.gov/hearings",
            "https://energycommerce.house.gov/subcommittee/health",
        ],
        "link_patterns": [
            r"/sites/.*energycommerce.*\.pdf",
            r"/sites/.*energycommerce.*/files/",
            r"/hearings/",
        ],
        "max_pages": 30,
    },

    # ── Senate HELP Committee ─────────────────────────────────────────────
    "help.senate.gov": {
        "start_urls": [
            "https://www.help.senate.gov/hearings",
            "https://www.help.senate.gov/reports",
        ],
        "link_patterns": [
            r"/imo/media/doc/.*\.pdf",
            r"/hearings/",
        ],
        "max_pages": 25,
    },

    # ── Senate Special Committee on Aging ─────────────────────────────────
    "aging.senate.gov": {
        "start_urls": [
            "https://www.aging.senate.gov/hearings",
            "https://www.aging.senate.gov/reports",
        ],
        "link_patterns": [
            r"/imo/media/doc/.*\.pdf",
            r"/hearings/",
        ],
        "max_pages": 25,
    },

    # ── Joint Economic Committee ───────────────────────────────────────────
    "jec.senate.gov": {
        "start_urls": [
            "https://www.jec.senate.gov/public/index.cfm/reports",
            "https://www.jec.senate.gov/public/index.cfm/hearings",
        ],
        "link_patterns": [
            r"/public/_cache/files/.*\.pdf",
            r"/hearings",
            r"/reports",
        ],
        "max_pages": 25,
    },

    # ── HHS / ASPE ────────────────────────────────────────────────────────
    "hhs.gov": {
        "start_urls": [
            "https://aspe.hhs.gov/reports",
        ],
        "link_patterns": [
            r"/system/files/\d{4}-.*/.*\.pdf",
            r"/reports/",
            r"\.pdf$",
        ],
        "max_pages": 30,
    },

    # ── National Academies of Sciences / NAM ──────────────────────────────
    "nationalacademies.org": {
        "start_urls": [
            "https://www.nationalacademies.org/our-work/health-medicine",
        ],
        "link_patterns": [
            r"/catalog/\d+",
            r"nap\.edu/catalog/\d+",
            r"nap\.edu/read/\d+",
        ],
        "max_pages": 30,
    },

    # ── House Ways & Means ────────────────────────────────────────────────
    "waysandmeans.house.gov": {
        "start_urls": [
            "https://waysandmeans.house.gov/hearings/",
            "https://waysandmeans.house.gov/newsroom/",
        ],
        "link_patterns": [
            r"/hearings/",
            r"\.pdf$",
        ],
        "max_pages": 25,
    },

    # ── Treasury ──────────────────────────────────────────────────────────
    "treasury.gov": {
        "start_urls": [
            "https://home.treasury.gov/policy-issues/tax-policy",
            "https://home.treasury.gov/news/press-releases",
        ],
        "link_patterns": [
            r"\.pdf$",
            r"/news/press-releases/",
            r"/policy-issues/",
        ],
        "max_pages": 25,
    },

    # ── CMS ───────────────────────────────────────────────────────────────
    "cms.gov": {
        "start_urls": [
            "https://www.cms.gov/Research-Statistics-Data-and-Systems/Research/ActuarialStudies",
        ],
        "link_patterns": [
            r"/CCIIO/Resources/.*\.pdf",
            r"\.pdf$",
            r"/Research-Statistics",
        ],
        "max_pages": 25,
    },

<<<<<<< HEAD
=======
    # ── House Oversight Committee ─────────────────────────────────────────
    "oversight.house.gov": {
        "start_urls": [
            "https://oversight.house.gov/hearings",
            "https://oversight.house.gov/reports",
        ],
        "link_patterns": [
            r"\.pdf$",
            r"/hearings/",
            r"/reports/",
        ],
        "max_pages": 25,
    },

    # ── Senate Judiciary Committee ────────────────────────────────────────
    "judiciary.senate.gov": {
        "start_urls": [
            "https://www.judiciary.senate.gov/hearings",
        ],
        "link_patterns": [
            r"/imo/media/doc/.*\.pdf",
            r"/hearings/",
        ],
        "max_pages": 20,
    },

    # ── Senate Budget Committee ───────────────────────────────────────────
    "budget.senate.gov": {
        "start_urls": [
            "https://www.budget.senate.gov/hearings",
        ],
        "link_patterns": [
            r"/imo/media/doc/.*\.pdf",
            r"/hearings/",
        ],
        "max_pages": 20,
    },

    # ── Senate Commerce Committee ─────────────────────────────────────────
    "commerce.senate.gov": {
        "start_urls": [
            "https://www.commerce.senate.gov/hearings",
            "https://www.commerce.senate.gov/reports",
        ],
        "link_patterns": [
            r"/services/files/.*",
            r"/hearings/",
            r"\.pdf$",
        ],
        "max_pages": 25,
    },

    # ── Senate Appropriations ─────────────────────────────────────────────
    "appropriations.senate.gov": {
        "start_urls": [
            "https://www.appropriations.senate.gov/hearings",
        ],
        "link_patterns": [
            r"/imo/media/doc/.*\.pdf",
            r"/hearings/",
        ],
        "max_pages": 20,
    },

    # ── House Judiciary Committee ─────────────────────────────────────────
    "judiciary.house.gov": {
        "start_urls": [
            "https://judiciary.house.gov/hearings",
        ],
        "link_patterns": [
            r"\.pdf$",
            r"/hearings/",
            r"/calendar/",
        ],
        "max_pages": 20,
    },

    # ── California Health Benefits Review Program ─────────────────────────
    "chbrp.org": {
        "start_urls": [
            "https://www.chbrp.org/completed-analyses",
        ],
        "link_patterns": [
            r"\.pdf$",
            r"/analyses/",
        ],
        "max_pages": 20,
    },

>>>>>>> f3759bd (initial commit)
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_year(text: str) -> Optional[int]:
    """Pull the first 4-digit year (2000–2029 or 199x) from a string."""
    matches = re.findall(r"\b(20[012]\d|199\d)\b", text)
    return int(matches[0]) if matches else None


def _same_domain(url: str, domain: str) -> bool:
    """Return True if the URL belongs to the same domain."""
    return domain in urlparse(url).netloc


async def _fetch_html(client: httpx.AsyncClient, url: str) -> Optional[str]:
    """Download a page and return its HTML. Returns None on any failure."""
    try:
        resp = await client.get(url, follow_redirects=True, timeout=20)
        ct = resp.headers.get("content-type", "")
        if resp.status_code == 200 and "html" in ct:
            return resp.text
    except Exception as e:
        logger.debug(f"Fetch failed {url[:80]}: {e}")
    return None


def _page_text(soup: BeautifulSoup) -> str:
    """Extract visible body text from a BeautifulSoup tree."""
    for tag in soup.select("nav, header, footer, script, style, aside"):
        tag.decompose()
    return soup.get_text(separator=" ", strip=True)


def _page_title(soup: BeautifulSoup) -> str:
    el = soup.select_one("h1") or soup.select_one("title")
    return el.get_text(strip=True) if el else ""


# ── Main entry point ───────────────────────────────────────────────────────────

async def deep_scrape_source(
    source_name: str,
    source_url: str,
    source_id: Optional[int],
    config: dict,
) -> List[Dict]:
    """
    Deep-scrape a single source:
    - Start from known high-value listing pages
    - Follow links matching the source's link_patterns
    - Return one document dict per page/PDF found

    PDFs are returned with is_pdf=True and empty text_content
    — the pipeline will download and extract them later.

    HTML pages are returned with their visible text already extracted.
    """
    # Find which config applies to this source
    domain = urlparse(source_url).netloc.replace("www.", "")
    deep_cfg = None
    for key, cfg in DEEP_CONFIGS.items():
        if key in domain:
            deep_cfg = cfg
            break

    if not deep_cfg:
        # Generic fallback for sources not in DEEP_CONFIGS
        deep_cfg = {
            "start_urls": [source_url],
            "link_patterns": [r"\.pdf$", r"/report", r"/hearing", r"/publication"],
            "max_pages": 15,
        }

    documents: List[Dict] = []
    visited: Set[str] = set()
    to_visit: List[str] = list(deep_cfg["start_urls"])
    max_pages = deep_cfg.get("max_pages", 20)

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:
        while to_visit and len(visited) < max_pages:
            url = to_visit.pop(0)
            if url in visited:
                continue
            visited.add(url)

            html = await _fetch_html(client, url)
            if not html:
                continue

            soup = BeautifulSoup(html, "lxml")
            title = _page_title(soup)
            text = _page_text(soup)

            # Add this HTML page as a document if it has meaningful content
            if len(text) > 200:
                documents.append({
                    "title": title or url,
                    "url": url,
                    "publisher": source_name,
                    "year": _extract_year(title + " " + url),
                    "text_content": text[:50_000],  # cap at 50k chars
                    "is_pdf": False,
                    "needs_fetch": False,  # text already extracted above
                    "source_id": source_id,
                    "fingerprint": make_fingerprint(url),
                })

            # Find links to follow or PDFs to collect
            for a in soup.select("a[href]"):
                href = (a.get("href") or "").strip()
                if not href or href.startswith("#") or href.startswith("mailto:"):
                    continue

                full_url = urljoin(url, href)
                if full_url in visited:
                    continue

                is_pdf = full_url.lower().split("?")[0].endswith(".pdf")
                matches_pattern = any(
                    re.search(p, full_url, re.I)
                    for p in deep_cfg["link_patterns"]
                )

                if is_pdf and full_url not in visited:
                    # Collect PDF — pipeline will extract text from it
                    visited.add(full_url)
                    link_text = a.get_text(strip=True)
                    documents.append({
                        "title": link_text or title or full_url,
                        "url": full_url,
                        "publisher": source_name,
                        "year": _extract_year(link_text + " " + full_url),
                        "text_content": "",
                        "is_pdf": True,
                        "needs_fetch": True,
                        "source_id": source_id,
                        "fingerprint": make_fingerprint(full_url),
                    })

                elif matches_pattern and _same_domain(full_url, domain):
                    # Queue this page for crawling
                    to_visit.append(full_url)

            # Polite delay between requests (avoid getting blocked)
            await asyncio.sleep(0.5)

    pdf_count = sum(1 for d in documents if d.get("is_pdf"))
    logger.info(
        f"[DeepScrape] {source_name}: visited {len(visited)} pages, "
        f"found {len(documents)} docs ({pdf_count} PDFs)"
    )
    return documents
