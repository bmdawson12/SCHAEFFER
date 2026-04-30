/**
 * Build a URL with Chrome's scroll-to-text-fragment (#:~:text=) so that
 * clicking a citation link scrolls to and highlights the cited person's
 * name inside the source document.
 *
 * - Works for HTML pages in Chrome, Edge, and Safari (iOS 17+).
 * - For PDFs, appends #search=TEXT — note that this only works in
 *   Firefox's built-in PDF.js viewer. Chrome's PDF viewer does NOT
 *   support `#search=`. Prefer using {@link openCitationLink} for PDF
 *   links so the faculty name is copied to the clipboard instead.
 * - If the URL already has a fragment, replaces it.
 */
export function buildHighlightedUrl(url: string | null | undefined, searchText: string | null | undefined): string {
  if (!url) return ''
  if (!searchText || !searchText.trim()) return url

  // Strip existing fragment
  const base = url.split('#')[0]

  // Pick a concise, encodable phrase. The text fragment API requires an
  // exact substring match, so use the faculty's full name which is
  // almost always unique within the document.
  const phrase = searchText.trim().slice(0, 80)
  const encoded = encodeURIComponent(phrase)

  const isPdf = /\.pdf(\?|$)/i.test(base)

  if (isPdf) {
    // PDF viewers in Chromium use #search=TEXT (also #page=N supported)
    return `${base}#search=${encoded}`
  }

  // HTML: Chrome scroll-to-text-fragment
  return `${base}#:~:text=${encoded}`
}

/** Return value from {@link openCitationLink}. */
export interface CitationLinkResult {
  isPdf: boolean
}

/**
 * Smart click handler for citation source links.
 *
 * - **HTML links**: opens the URL with `#:~:text=NAME` in a new tab
 *   (Chrome scroll-to-text works natively).
 * - **PDF links**: copies `facultyName` to the clipboard so the user
 *   can Ctrl+F in the PDF viewer, then opens the raw URL in a new tab.
 *   Returns `{ isPdf: true }` so callers can show a toast notification.
 */
export async function openCitationLink(
  url: string,
  facultyName: string,
): Promise<CitationLinkResult> {
  const base = url.split('#')[0]
  const isPdf = /\.pdf(\?|$)/i.test(base)

  if (isPdf) {
    await navigator.clipboard.writeText(facultyName)
    window.open(url, '_blank', 'noopener,noreferrer')
    return { isPdf: true }
  }

  // HTML — use text-fragment highlight
  const highlighted = buildHighlightedUrl(url, facultyName)
  window.open(highlighted, '_blank', 'noopener,noreferrer')
  return { isPdf: false }
}
