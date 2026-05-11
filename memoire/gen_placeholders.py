"""Generate simple placeholder PNG images for missing diagram figures."""
import struct, zlib, os

def make_png(path, label, w=900, h=500):
    """Write a minimal PNG: light-grey background with centred label text."""
    # We'll use PIL if available, otherwise write a solid-colour PNG
    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new("RGB", (w, h), (245, 245, 245))
        draw = ImageDraw.Draw(img)
        draw.rectangle([10, 10, w-10, h-10], outline=(180, 180, 180), width=3)
        # Estimate text position (no TTF needed)
        tw = len(label) * 9
        draw.text(((w - tw) // 2, h // 2 - 10), label, fill=(120, 120, 120))
        img.save(path)
        return
    except ImportError:
        pass

    # Fallback: plain solid-grey PNG via raw PNG encoding
    def png_chunk(name, data):
        c = zlib.crc32(name + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + name + data + struct.pack(">I", c)

    def solid_png(path, w, h, r, g, b):
        sig = b"\x89PNG\r\n\x1a\n"
        ihdr = png_chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        row = b"\x00" + bytes([r, g, b] * w)
        raw = zlib.compress(row * h)
        idat = png_chunk(b"IDAT", raw)
        iend = png_chunk(b"IEND", b"")
        with open(path, "wb") as f:
            f.write(sig + ihdr + idat + iend)

    solid_png(path, w, h, 235, 235, 235)

base = os.path.dirname(os.path.abspath(__file__))
img_dir = os.path.join(base, "images")

placeholders = {
    "activity_scrape":       "Activity Diagram — Scraping Pipeline",
    "sequence_recommend":    "Sequence Diagram — Recommendation Request",
    "sequence_auth":         "Sequence Diagram — User Registration / Login",
    "erd":                   "Entity-Relationship Diagram",
    "architecture_overview": "System Architecture Overview",
    "sus_chart":             "SUS Score Distribution (53 participants)",
}

for name, label in placeholders.items():
    path = os.path.join(img_dir, f"{name}.png")
    if not os.path.exists(path):
        make_png(path, label)
        print(f"Created: {name}.png")
    else:
        print(f"Skipped (exists): {name}.png")

print("Done.")
