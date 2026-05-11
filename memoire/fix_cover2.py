"""
Patch fix: operate on current page_de_garde_filled.docx
Issues left after first pass (indices in the current post-clone state):
  [48] = 'rénom'           → clear  (shadow student extra node)
  [79] = '·'              → clear  (dot not cleared)
  [83] = 'P'              → 'Mme BENAHMED-EL-ALIA Nadia'
  [84] = 'rénom'          → clear
  [86] = 'NOM'            → clear
  [87] = '·'              → clear  (shadow sup dot)
Then clone the shadow-supervisor paragraph (the one that will have 'Mme...')
to add 'M. BALLA Amar' as a second bullet in the shadow layer.
"""

import copy
from pathlib import Path
from docx import Document

DEST = Path(r"C:\Users\Z-REPAIR INFO\Downloads\mobile-match-algeria\memoire\page_de_garde_filled.docx")

ns  = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML = "http://www.w3.org/XML/1998/namespace"

def set_t(node, text):
    node.text = text
    if text:
        node.set(f"{{{XML}}}space", "preserve")
    else:
        node.attrib.pop(f"{{{XML}}}space", None)

def parent_para(node):
    el = node
    while el is not None:
        if el.tag == f"{{{ns}}}p":
            return el
        el = el.getparent()
    return None

doc = Document(DEST)
nodes = list(doc.element.body.iter(f"{{{ns}}}t"))
print(f"Total nodes: {len(nodes)}")

# ── Clear shadow student extra node ──────────────────────────────────────────
set_t(nodes[48], "")

# ── Clear dot at [79] ─────────────────────────────────────────────────────────
set_t(nodes[79], "")

# ── Set shadow supervisor name ────────────────────────────────────────────────
shadow_sup_node = nodes[83]
set_t(shadow_sup_node, "Mme BENAHMED-EL-ALIA Nadia")
set_t(nodes[84], "")
set_t(nodes[86], "")

# ── Clear shadow supervisor dot ───────────────────────────────────────────────
set_t(nodes[87], "")

# ── Clone shadow supervisor paragraph for second supervisor ───────────────────
para_shadow = parent_para(shadow_sup_node)
assert para_shadow is not None

para_shadow2 = copy.deepcopy(para_shadow)
for t in para_shadow2.iter(f"{{{ns}}}t"):
    t.text = ""
    t.attrib.pop(f"{{{XML}}}space", None)

first_t = next(para_shadow2.iter(f"{{{ns}}}t"))
set_t(first_t, "M. BALLA Amar")

para_shadow.addnext(para_shadow2)

doc.save(DEST)
print("Saved:", DEST)

# ── Verify ────────────────────────────────────────────────────────────────────
doc2 = Document(DEST)
print("\n--- Non-empty w:t nodes ---")
for i, n in enumerate(doc2.element.body.iter(f"{{{ns}}}t")):
    if n.text and n.text.strip():
        print(f"  [{i:3d}] {repr(n.text)}")
