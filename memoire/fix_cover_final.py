"""
Definitive cover page fix — based on exact paragraph indices from original docx.

Original paragraph map (relevant entries):
  [28] list=True  txbx    'Preom NOM'      -> student name para (set + clone NOT needed here)
  [29] list=True  txbx    '.'              -> DOT PARA — DELETE
  [30] not-list   txbx    'THEME '         -> theme para
  [39] list=True  textbox 'Preom NOM'      -> shadow student name
  [40] list=True  textbox '.'              -> DOT PARA — DELETE
  [41] not-list   textbox 'THEME '         -> shadow theme
  [65] list=True  txbx    'Preom NOM'      -> supervisor name para
  [66] list=True  txbx    '.'              -> DOT PARA — DELETE
  [68] list=True  textbox 'Preom NOM'      -> shadow supervisor name
  [69] list=True  textbox '.'             -> DOT PARA — DELETE
"""

import shutil, copy
from pathlib import Path
from docx import Document
from lxml import etree

SRC  = Path(r"C:\Users\Z-REPAIR INFO\Downloads\mobile-match-algeria\Page de garde.docx")
DEST = Path(r"C:\Users\Z-REPAIR INFO\Downloads\mobile-match-algeria\memoire\page_de_garde_filled.docx")
THEME = ("Application web de comparaison des offres mobiles : "
         "«Mobile Match Algérie»")

shutil.copy2(SRC, DEST)
doc = Document(DEST)

ns  = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML = "http://www.w3.org/XML/1998/namespace"
v   = "urn:schemas-microsoft-com:vml"
a   = "http://schemas.openxmlformats.org/drawingml/2006/main"

def set_t(node, text):
    node.text = text
    if text:
        node.set(f"{{{XML}}}space", "preserve")
    else:
        node.attrib.pop(f"{{{XML}}}space", None)

def clear_para_text(para, new_text=""):
    ts = list(para.iter(f"{{{ns}}}t"))
    for t in ts:
        set_t(t, "")
    if new_text and ts:
        set_t(ts[0], new_text)

def clone_para_with_text(para, new_text):
    clone = copy.deepcopy(para)
    ts = list(clone.iter(f"{{{ns}}}t"))
    for t in ts:
        set_t(t, "")
    if ts:
        set_t(ts[0], new_text)
    return clone

# Snapshot all paragraphs from original (stable indices)
all_paras = list(doc.element.body.iter(f"{{{ns}}}p"))
print(f"Total paragraphs: {len(all_paras)}")

# ── Student name (WPS txbx) — para[28] ───────────────────────────────────────
clear_para_text(all_paras[28], "Riad AMRATE")

# ── Dot para (WPS txbx) — para[29] — DELETE ──────────────────────────────────
all_paras[29].getparent().remove(all_paras[29])

# ── Theme (WPS txbx) — para[30] ──────────────────────────────────────────────
# After deletion of [29], para[30] is now at index 29 in the live tree
# But we already have a reference: use the object directly
clear_para_text(all_paras[30], THEME)

# ── Shadow student name (VML textbox) — para[39] ─────────────────────────────
clear_para_text(all_paras[39], "Riad AMRATE")

# ── Shadow dot para — para[40] — DELETE ──────────────────────────────────────
all_paras[40].getparent().remove(all_paras[40])

# ── Shadow theme — para[41] ──────────────────────────────────────────────────
clear_para_text(all_paras[41], THEME)

# ── Supervisor name (WPS txbx) — para[65] ────────────────────────────────────
clear_para_text(all_paras[65], "Mme BENAHMED-EL-ALIA Nadia")

# ── Supervisor dot para — para[66] — DELETE ──────────────────────────────────
all_paras[66].getparent().remove(all_paras[66])

# ── Clone supervisor para for second supervisor ───────────────────────────────
sup2 = clone_para_with_text(all_paras[65], "M. BALLA Amar")
all_paras[65].addnext(sup2)

# ── Shadow supervisor name — para[68] ────────────────────────────────────────
clear_para_text(all_paras[68], "Mme BENAHMED-EL-ALIA Nadia")

# ── Shadow supervisor dot para — para[69] — DELETE ───────────────────────────
all_paras[69].getparent().remove(all_paras[69])

# ── Clone shadow supervisor para ─────────────────────────────────────────────
sup2_shadow = clone_para_with_text(all_paras[68], "M. BALLA Amar")
all_paras[68].addnext(sup2_shadow)

# ── Increase supervisor textbox height ───────────────────────────────────────
# VML: height:78.7pt -> height:120pt
shapes = list(doc.element.body.iter(f"{{{v}}}shape"))
for s in shapes:
    style = s.get("style", "")
    if "height:78.7pt" in style:
        s.set("style", style.replace("height:78.7pt", "height:120pt"))
        print("Updated VML shape height to 120pt")

# WPS: a:ext cy ~999500 EMU (78.7pt) -> 1524000 EMU (120pt)
for ext in doc.element.body.iter(f"{{{a}}}ext"):
    cy = ext.get("cy")
    if cy and 990000 <= int(cy) <= 1010000:
        ext.set("cy", "1524000")
        print(f"Updated WPS a:ext cy {cy} to 1524000")

doc.save(DEST)
print("Saved:", DEST)

# ── Final verification ────────────────────────────────────────────────────────
doc2 = Document(DEST)
print("\n--- Non-empty content ---")
for i, n in enumerate(doc2.element.body.iter(f"{{{ns}}}t")):
    if n.text and n.text.strip():
        print(f"  [{i:3d}] {repr(n.text[:60])}")
