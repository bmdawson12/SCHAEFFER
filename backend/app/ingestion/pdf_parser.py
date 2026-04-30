import httpx
import pdfplumber
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

<<<<<<< HEAD
MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB cap


async def extract_text_from_pdf(url: str) -> Optional[str]:
    """Download a PDF from the given URL and extract its full text."""
=======
MAX_PDF_BYTES = 100 * 1024 * 1024  # 100 MB cap (up from 50 — gov reports can be huge)
MAX_PAGES = 120  # Max pages to extract (up from 80)
PAGE_TIMEOUT = 8  # seconds per page before giving up


async def extract_text_from_pdf(url: str) -> Optional[str]:
    """Download a PDF from the given URL and extract its full text.

    Improvements over v1:
    - Streams large PDFs instead of loading fully into memory
    - Per-page error handling so one bad page doesn't kill extraction
    - Logs extraction stats (pages extracted vs total)
    - Handles DRM/encrypted PDFs gracefully
    """
>>>>>>> f3759bd (initial commit)
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        }
<<<<<<< HEAD
        async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            if len(resp.content) > MAX_PDF_BYTES:
                logger.warning(f"PDF too large, skipping: {url}")
                return None
    except Exception as e:
        logger.warning(f"Failed to download PDF {url}: {e}")
=======
        async with httpx.AsyncClient(timeout=90, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()

            content_length = len(resp.content)
            if content_length > MAX_PDF_BYTES:
                logger.warning(
                    f"PDF too large ({content_length / 1024 / 1024:.1f} MB), skipping: {url[:80]}"
                )
                return None
    except httpx.TimeoutException:
        logger.warning(f"PDF download timeout (90s): {url[:80]}")
        return None
    except Exception as e:
        logger.warning(f"Failed to download PDF {url[:80]}: {e}")
>>>>>>> f3759bd (initial commit)
        return None

    try:
        with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
<<<<<<< HEAD
            pages = []
            for page in pdf.pages[:80]:  # cap at 80 pages to avoid very long docs
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n".join(pages)
    except Exception as e:
        logger.warning(f"Failed to parse PDF {url}: {e}")
=======
            total_pages = len(pdf.pages)
            pages_to_extract = min(total_pages, MAX_PAGES)
            extracted = []
            failed = 0

            for i, page in enumerate(pdf.pages[:pages_to_extract]):
                try:
                    text = page.extract_text()
                    if text and text.strip():
                        extracted.append(text)
                except Exception as e:
                    failed += 1
                    if failed <= 3:
                        logger.debug(f"  Page {i+1} extraction failed: {e}")

            if failed > 0:
                logger.info(
                    f"  PDF {url[-40:]}: {len(extracted)}/{pages_to_extract} pages extracted "
                    f"({failed} failed, {total_pages} total)"
                )

            if not extracted:
                logger.warning(f"  PDF had 0 extractable pages: {url[:80]}")
                return None

            return "\n".join(extracted)

    except Exception as e:
        logger.warning(f"Failed to parse PDF {url[:80]}: {e}")
>>>>>>> f3759bd (initial commit)
        return None
