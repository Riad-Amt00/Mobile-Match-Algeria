"""
Fix page_de_garde_filled.docx:
- Student name: "Riad AMRATE" (single name, no trailing dot paragraph)
- Theme: full French title (both layers)
- Supervisors: two clean bullet lines — "Mme BENAHMED-EL-ALIA Nadia" and "M. BALLA Amar"
  achieved by cloning the supervisor paragraph, NOT using <w:br/>
- Clear all stray dot paragraphs (nodes 23, 51, 75, 83)
"""

import shutil, copy
from pathlib import Path
from docx import Document
from lxml import etree

SRC  = Path(r"C:\Users\Z-REPAIR INFO\Downloads\mobile-match-algeria\Page de garde.docx")
DEST = Path(r"C:\Users\Z-REPAIR INFO\Downloads\mobile-match-algeria\memoire\page_de_garde_filled.docx")

THEME = ("Application web de comparaison des offres mobiles : "
         "«Mobile Match Algérie»")

shutil.copy2(SRC, DEST)
doc = Document(DEST)

# Collect every w:t node in document order
ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

def all_wt(doc):
    return doc.element.body.iter(f"{{{ns}}}t")

nodes = list(all_wt(doc))
print(f"Total w:t nodes: {len(nodes)}")

# ── Helper ────────────────────────────────────────────────────────────────────

def set_t(node, text):
    node.text = text
    if text:
        node.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    else:
        node.attrib.pop("{http://www.w3.org/XML/1998/namespace}space", None)

def parent_para(node):
    """Walk up until we hit a w:p element."""
    el = node
    while el is not None:
        if el.tag == f"{{{ns}}}p":
            return el
        el = el.getparent()
    return None

# ── Student name — Layer 1 (nodes 19, 20, 22) ────────────────────────────────
# Node 19 gets the full name, nodes 20 and 22 are cleared
set_t(nodes[19], "Riad AMRATE")
set_t(nodes[20], "")
set_t(nodes[22], "")

# ── Dot paragraph below student name — Layer 1 (node 23) ─────────────────────
set_t(nodes[23], "")

# ── Student name — Layer 2 / shadow (nodes 47, 50) ───────────────────────────
set_t(nodes[47], "Riad AMRATE")
set_t(nodes[50], "")

# ── Dot paragraph below student name — Layer 2 (node 51) ─────────────────────
set_t(nodes[51], "")

# ── Theme — Layer 1 (node 25) ─────────────────────────────────────────────────
set_t(nodes[25], THEME)

# ── Theme — Layer 2 / shadow (node 53) ───────────────────────────────────────
set_t(nodes[53], THEME)

# ── Supervisors — Layer 1 ─────────────────────────────────────────────────────
# Para H: nodes 71, 72, 74 — set first supervisor, clear extras
set_t(nodes[71], "Mme BENAHMED-EL-ALIA Nadia")
set_t(nodes[72], "")
set_t(nodes[74], "")

para_h = parent_para(nodes[71])
assert para_h is not None, "Could not find supervisor paragraph (para H)"

# Clone para H for second supervisor
para_h2 = copy.deepcopy(para_h)

# Clear all w:t text in the clone, then set the first one to supervisor 2
for t in para_h2.iter(f"{{{ns}}}t"):
    t.text = ""
    t.attrib.pop("{http://www.w3.org/XML/1998/namespace}space", None)

first_t_clone = next(para_h2.iter(f"{{{ns}}}t"))
set_t(first_t_clone, "M. BALLA Amar")

# Insert clone immediately after para_h
para_h.addnext(para_h2)

# Clear dot paragraph after supervisor block — node 75
# (indices shift after insert, so re-collect)
nodes = list(all_wt(doc))
# Find node whose text is '·' in the area around index 75-85
for i, n in enumerate(nodes):
    if n.text and n.text.strip() == '·':
        print(f"  Clearing dot node [{i}]: '{n.text}'")
        set_t(n, "")

# ── Supervisors — Layer 2 / shadow ───────────────────────────────────────────
# After re-collecting, find the shadow supervisor paragraph
# Shadow layer nodes were at ~79-83 (original indices).
# Identify by locating the second occurrence of a paragraph that still has
# supervisor-like text. Since we cleared all dots, search for para K by content.

# Re-collect once more to find clean indices
nodes = list(all_wt(doc))

# Find all paragraphs that contain text we just set for supervisor 1
# The shadow layer should be nearby — identify by checking text content
shadow_sup_paras = []
for n in nodes:
    if n.text == "Mme BENAHMED-EL-ALIA Nadia":
        p = parent_para(n)
        if p is not None and p is not para_h:
            shadow_sup_paras.append(p)

print(f"Shadow supervisor paragraphs found: {len(shadow_sup_paras)}")

for sp in shadow_sup_paras:
    # Clear extras in this para
    ts = list(sp.iter(f"{{{ns}}}t"))
    for t in ts:
        t.text = ""
        t.attrib.pop("{http://www.w3.org/XML/1998/namespace}space", None)
    set_t(ts[0], "Mme BENAHMED-EL-ALIA Nadia")

    # Clone for second supervisor
    sp2 = copy.deepcopy(sp)
    for t in sp2.iter(f"{{{ns}}}t"):
        t.text = ""
        t.attrib.pop("{http://www.w3.org/XML/1998/namespace}space", None)
    first_t = next(sp2.iter(f"{{{ns}}}t"))
    set_t(first_t, "M. BALLA Amar")
    sp.addnext(sp2)

doc.save(DEST)
print("Saved:", DEST)

# ── Verify ────────────────────────────────────────────────────────────────────
doc2 = Document(DEST)
print("\n--- Non-empty w:t nodes ---")
for i, n in enumerate(doc2.element.body.iter(f"{{{ns}}}t")):
    if n.text and n.text.strip():
        print(f"  [{i:3d}] {repr(n.text)}")
