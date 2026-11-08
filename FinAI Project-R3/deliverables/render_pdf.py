"""Render the documentation PDF to per-page PNGs for visual verification."""
import sys
import fitz

pdf, out = sys.argv[1], sys.argv[2]
doc = fitz.open(pdf)
for i, page in enumerate(doc, start=1):
    pix = page.get_pixmap(dpi=110)
    pix.save(f"{out}/page-{i:02d}.png")
print(f"rendered {len(doc)} pages to {out}")
