"""
Clean fix — start fresh from original:
1. Set student name, theme (both layers)
2. DELETE the dot/empty bullet paragraphs (not just clear text)
3. Set supervisors: two proper bullet paragraphs via clone
4. Increase supervisor textbox height (VML + WPS) so both names fit
"""
import shutil, copy, re
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
wps = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"

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

def para_text(p):
    return "".join(t.text or "" for t in p.iter(f"{{{ns}}}t")).strip()

# ── Collect nodes by original index ──────────────────────────────────────────
nodes = list(doc.element.body.iter(f"{{{ns}}}t"))
print(f"Total w:t nodes: {len(nodes)}")

# ── Layer 1: student name ─────────────────────────────────────────────────────
# Original nodes: [19]='P', [20]='rénom', [22]='NOM'
set_t(nodes[19], "Riad AMRATE")
set_t(nodes[20], "")
set_t(nodes[22], "")

# ── Layer 1: DELETE dot paragraph (node 23 = '·') ────────────────────────────
dot_para_1 = parent_para(nodes[23])
assert dot_para_1 is not None
dot_para_1.getparent().remove(dot_para_1)
print("Deleted student dot para (layer 1)")

# ── Theme layer 1 ─────────────────────────────────────────────────────────────
# Re-collect after removal
nodes = list(doc.element.body.iter(f"{{{ns}}}t"))
set_t(nodes[25], THEME)

# ── Layer 2 (shadow): student name ───────────────────────────────────────────
# After deletion of dot_para_1, node indices shift. Re-use content search.
nodes = list(doc.element.body.iter(f"{{{ns}}}t"))

# Find shadow student name nodes (second occurrence of 'P'/'rénom'/'NOM' cluster)
# Original [47]='P', [48]='rénom', [50]='NOM'  (approx, shifted by -1 after deletion)
# Safer: search by content
student_name_nodes = [n for n in nodes if n.text == 'P' and
                      any(s.text == 'rénom' for s in n.getparent().iter(f"{{{ns}}}t"))]
print(f"Student name 'P' paragraphs: {len(student_name_nodes)}")

# Clear all of them and set first one to full name
for n in student_name_nodes:
    para = n.getparent()
    ts = list(para.iter(f"{{{ns}}}t"))
    for t in ts:
        set_t(t, "")
    set_t(ts[0], "Riad AMRATE")

# DELETE all remaining dot paragraphs (text = '·' or '\xb7')
nodes = list(doc.element.body.iter(f"{{{ns}}}t"))
removed = 0
for n in nodes:
    if n.text in ('·', '\xb7', '•', '▪', '·', '▪', '•'):
        p = parent_para(n)
        if p is not None:
            p.getparent().remove(p)
            removed += 1
print(f"Deleted {removed} dot paragraphs")

# ── Theme layer 2 (shadow) ───────────────────────────────────────────────────
nodes = list(doc.element.body.iter(f"{{{ns}}}t"))
theme_nodes = [n for n in nodes if 'THEME' in (n.text or '') or
               ('Application' in (n.text or '') and 'Mobile' in (n.text or ''))]
# Set all theme nodes that are just placeholders or already set
for n in nodes:
    if n.text == 'THEME ':
        set_t(n, THEME)

# ── Supervisors layer 1: find para H ─────────────────────────────────────────
nodes = list(doc.element.body.iter(f"{{{ns}}}t"))

# Para H: contains 'P', 'rénom', 'NOM' and is inside the supervisor section
# (comes after the 'Encadré Par :' label)
# Find the 'Encadré Par :' label paragraphs first
encadre_paras = []
all_paras = list(doc.element.body.iter(f"{{{ns}}}p"))
for p in all_paras:
    txt = para_text(p)
    if 'Encadr' in txt and 'Par' in txt:
        encadre_paras.append(p)
print(f"'Encadré Par' paragraphs: {len(encadre_paras)}")

def next_sibling_para(p):
    parent = p.getparent()
    children = list(parent)
    idx = children.index(p)
    if idx + 1 < len(children):
        return children[idx + 1]
    return None

for ep in encadre_paras:
    # The next sibling para is the supervisor name para (para H or K)
    name_para = next_sibling_para(ep)
    if name_para is None:
        continue
    ts = list(name_para.iter(f"{{{ns}}}t"))
    if not ts:
        continue
    # Set first supervisor
    for t in ts:
        set_t(t, "")
    set_t(ts[0], "Mme BENAHMED-EL-ALIA Nadia")
    print(f"  Set supervisor para text")

    # Clone for second supervisor
    name_para2 = copy.deepcopy(name_para)
    for t in name_para2.iter(f"{{{ns}}}t"):
        t.text = ""
        t.attrib.pop(f"{{{XML}}}space", None)
    first_t2 = next(name_para2.iter(f"{{{ns}}}t"))
    set_t(first_t2, "M. BALLA Amar")
    name_para.addnext(name_para2)
    print(f"  Cloned para for second supervisor")

# ── Increase supervisor textbox height ───────────────────────────────────────
# VML shape with height:78.7pt → height:120pt
shapes = list(doc.element.body.iter(f"{{{v}}}shape"))
for s in shapes:
    style = s.get("style", "")
    if "height:78.7pt" in style:
        new_style = style.replace("height:78.7pt", "height:120pt")
        s.set("style", new_style)
        print(f"Updated VML shape height: 78.7pt to 120pt")

# WPS cx/cy: find a:ext with cy corresponding to 78.7pt = 999490 EMU
# 120pt = 1524000 EMU
all_ext = list(doc.element.body.iter(f"{{{a}}}ext"))
for ext in all_ext:
    cy = ext.get("cy")
    if cy and int(cy) in range(990000, 1010000):  # ~78.7pt ± small tolerance
        print(f"  WPS a:ext cy={cy} updating to 1524000")
        ext.set("cy", "1524000")

doc.save(DEST)
print("\nSaved:", DEST)

# ── Verify final state ───────────────────────────────────────────────────────
doc2 = Document(DEST)
print("\n--- Non-empty w:t nodes ---")
for i, n in enumerate(doc2.element.body.iter(f"{{{ns}}}t")):
    if n.text and n.text.strip():
        print(f"  [{i:3d}] {repr(n.text)}")
