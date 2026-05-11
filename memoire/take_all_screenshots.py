import os, sys, time
sys.stdout.reconfigure(encoding='utf-8')

IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")

from playwright.sync_api import sync_playwright

PAGES = [
    ("screenshot_home",      "http://localhost:3000",              1440, 900),
    ("screenshot_offers",    "http://localhost:3000/offers",       1440, 900),
    ("screenshot_compare",   "http://localhost:3000/compare",      1440, 900),
    ("screenshot_recommend", "http://localhost:3000/recommend",    1440, 900),
    ("screenshot_admin",     "http://localhost:3000/admin",        1440, 900),
    ("screenshot_login",     "http://localhost:3000/login",        1440, 900),
    ("screenshot_register",  "http://localhost:3000/register",     1440, 900),
    ("screenshot_saved",     "http://localhost:3000/saved",        1440, 900),
    ("screenshot_profile",   "http://localhost:3000/profile",      1440, 900),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    for name, url, w, h in PAGES:
        try:
            page.set_viewport_size({"width": w, "height": h})
            page.goto(url, wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(2500)
            out = os.path.join(IMG, f"{name}.png")
            page.screenshot(path=out, full_page=False)
            size = os.path.getsize(out)
            print(f"OK  {name}.png  ({size//1024} KB)")
        except Exception as e:
            print(f"ERR {name}: {e}")

    # Offers with first offer card visible for offer detail
    try:
        page.goto("http://localhost:3000/offers", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)
        # Click first offer card to see offer detail
        first_link = page.locator("a[href*='/offers/']").first
        if first_link:
            href = first_link.get_attribute("href")
            if href:
                page.goto(f"http://localhost:3000{href}", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)
                out = os.path.join(IMG, "screenshot_offer_detail.png")
                page.screenshot(path=out, full_page=False)
                print(f"OK  screenshot_offer_detail.png ({os.path.getsize(out)//1024} KB)")
    except Exception as e:
        print(f"WARN offer detail: {e}")

    # Offers page with filter panel open
    try:
        page.goto("http://localhost:3000/offers", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)
        # Try various filter button texts
        for text in ["Filters", "Filter", "Filtres", "Advanced"]:
            try:
                page.click(f"button:has-text('{text}')", timeout=2000)
                page.wait_for_timeout(1000)
                out = os.path.join(IMG, "screenshot_offers_filtered.png")
                page.screenshot(path=out, full_page=False)
                print(f"OK  screenshot_offers_filtered.png ({os.path.getsize(out)//1024} KB)")
                break
            except:
                pass
    except Exception as e:
        print(f"WARN offers filter: {e}")

    # Compare bar - select 2 offers
    try:
        page.goto("http://localhost:3000/offers", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)
        compare_btns = page.locator("button:has-text('Compare')").all()
        for btn in compare_btns[:2]:
            try:
                btn.click(timeout=2000)
                page.wait_for_timeout(400)
            except:
                pass
        page.wait_for_timeout(1200)
        out = os.path.join(IMG, "compare_bar.png")
        page.screenshot(path=out, full_page=False)
        print(f"OK  compare_bar.png ({os.path.getsize(out)//1024} KB)")
    except Exception as e:
        print(f"WARN compare bar: {e}")

    browser.close()
print("Done.")
