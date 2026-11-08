"""Post-process FinAI documentation docx:
1. Patch footer PAGE fields with explicit format switches (WPS compat).
2. Remove empty <w:pgNumType/> from the cover section.
Footer 1 = front matter (ROMAN), footer 2 = body (arabic).
"""
import re
import shutil
import sys
import zipfile

SRC = "FinAI_Project_Documentation.docx"

with zipfile.ZipFile(SRC) as z:
    names = z.namelist()
    data = {n: z.read(n) for n in names}

# 1. determine which footer is referenced by which section by scanning document.xml order
doc = data["word/document.xml"].decode("utf-8")

# remove empty pgNumType (cover section)
doc = doc.replace("<w:pgNumType/>", "")

# find footer rIds in order of sectPr appearance
sect_footers = re.findall(r'<w:footerReference w:type="default" r:id="(rId\d+)"/>', doc)
rels = data["word/_rels/document.xml.rels"].decode("utf-8")
rid_to_target = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(footer\d+\.xml)"', rels))

fmts = ["ROMAN", "arabic"]  # front matter first, body second
for i, rid in enumerate(sect_footers):
    target = rid_to_target.get(rid)
    if not target:
        continue
    key = f"word/{target}"
    xml = data[key].decode("utf-8")
    fmt = fmts[i] if i < len(fmts) else "arabic"
    xml = re.sub(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        rf"\1 PAGE \\* {fmt} \\* MERGEFORMAT \2",
        xml,
    )
    data[key] = xml.encode("utf-8")
    print(f"patched {target} -> {fmt}")

data["word/document.xml"] = doc.encode("utf-8")

tmp = SRC + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for n in names:
        z.writestr(n, data[n])
shutil.move(tmp, SRC)
print("post-processing done")
