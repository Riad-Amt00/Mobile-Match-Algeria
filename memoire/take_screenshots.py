import os, sys
sys.stdout.reconfigure(encoding='utf-8')

IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")

from playwright.sync_api import sync_playwright

PAGES = [
    ("screenshot_home",      "http://localhost:3000",           1440, 900),
    ("screenshot_offers",    "http://localhost:3000/offers",    1440, 900),
    ("screenshot_recommend", "http://localhost:3000/recommend", 1440, 900),
    ("screenshot_compare",   "http://localhost:3000/compare",   1440, 900),
    ("screenshot_admin",     "http://localhost:3000/admin",     1440, 900),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    for name, url, w, h in PAGES:
        try:
            page.set_viewport_size({"width": w, "height": h})
            page.goto(url, wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(3000)
            out = os.path.join(IMG, f"{name}.png")
            page.screenshot(path=out)
            size = os.path.getsize(out)
            print(f"OK  {name}.png  ({size//1024} KB)")
        except Exception as e:
            print(f"ERR {name}: {e}")

    # Offers page with filter panel open for a better screenshot
    try:
        page.goto("http://localhost:3000/offers", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)
        page.click("button:has-text('Filters')", timeout=5000)
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(IMG, "screenshot_offers.png"))
        print("OK  screenshot_offers.png (with filter panel)")
    except Exception as e:
        print(f"WARN offers filter panel: {e}")

    browser.close()

print("Done.")
