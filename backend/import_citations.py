"""
import_citations.py — Import historical citations from an Excel file.

Usage:
    python3 import_citations.py path/to/citations.xlsx

Reads the 'Citations' sheet and imports rows into the citations table.
Deduplicates by faculty+link to avoid creating duplicate entries.
"""

import sys
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "citations.db")


def import_from_excel(xlsx_path: str, db_path: str = DB_PATH):
    try:
        import pandas as pd
    except ImportError:
        print("ERROR: pandas is required. Install with: pip install pandas openpyxl")
        sys.exit(1)

    if not os.path.exists(xlsx_path):
        print(f"ERROR: File not found: {xlsx_path}")
        sys.exit(1)

    print(f"Reading: {xlsx_path}")
    df = pd.read_excel(xlsx_path, sheet_name="Citations")
    df.columns = [c.strip() for c in df.columns]

    # Find the faculty column (may have trailing space)
    fac_col = next((c for c in df.columns if "Faculty" in c), None)
    if not fac_col:
        print("ERROR: No 'Faculty' column found in the Citations sheet")
        sys.exit(1)

    df = df.dropna(subset=[fac_col])
    print(f"Rows with faculty data: {len(df)}")

    conn = sqlite3.connect(db_path)
    existing = conn.execute("SELECT COUNT(*) FROM citations").fetchone()[0]
    print(f"Existing citations in DB: {existing}")

    imported = 0
    skipped = 0

    for _, row in df.iterrows():
        def val(col, max_len=None):
            v = row.get(col)
            if pd.isna(v):
                return None
            v = str(v).strip()
            if not v:
                return None
            if max_len:
                v = v[:max_len]
            return v

        def int_val(col):
            v = row.get(col)
            if pd.isna(v):
                return None
            try:
                return int(float(v))
            except (ValueError, TypeError):
                return None

        faculty = val(fac_col)
        link = val("Link")

        if not faculty:
            skipped += 1
            continue

        # Deduplicate by faculty + link
        if link:
            dup = conn.execute(
                "SELECT id FROM citations WHERE faculty = ? AND link = ?",
                (faculty, link),
            ).fetchone()
            if dup:
                skipped += 1
                continue

        conn.execute(
            """INSERT INTO citations (
                short_research_tag, citation_type, title_of_paper, publication_cited,
                year_of_publication_cited, faculty, cited_in, year_of_government_publication,
                publisher, link, policy_area, is_auto_detected
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                val("Short Research Tag", 255),
                val("Type", 100),
                val("Title of Paper"),
                val("Publication Cited", 500),
                int_val("Year of Publication Cited"),
                faculty,
                val("Cited In"),
                int_val("Year of Government Publication"),
                val("Publisher", 500),
                link,
                val("Policy Area", 255),
                0,  # is_auto_detected = False
            ),
        )
        imported += 1

    conn.commit()
    total = conn.execute("SELECT COUNT(*) FROM citations").fetchone()[0]
    conn.close()

    print(f"\nImported: {imported}")
    print(f"Skipped (duplicates/empty): {skipped}")
    print(f"Total citations now: {total}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 import_citations.py <path_to_excel_file>")
        sys.exit(1)
    import_citations_path = sys.argv[1]
    import_from_excel(import_citations_path)
