import httpx
import pdfplumber
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB cap


async def extract_text_from_pdf(url: str) -> Optional[str]:
    """Download a PDF from the given URL and extract its full text."""
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        }
        async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            if len(resp.content) > MAX_PDF_BYTES:
                logger.warning(f"PDF too large, skipping: {url}")
                return None
    except Exception as e:
        logger.warning(f"Failed to download PDF {url}: {e}")
        return None

    try:
        with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
            pages = []
            for page in pdf.pages[:80]:  # cap at 80 pages to avoid very long docs
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n".join(pages)
    except Exception as e:
        logger.warning(f"Failed to parse PDF {url}: {e}")
        return None
