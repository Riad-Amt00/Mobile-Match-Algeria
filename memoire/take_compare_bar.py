import os, sys
sys.stdout.reconfigure(encoding='utf-8')

IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    try:
        page.goto("http://localhost:3000/offers", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)

        # Try to click first two offer compare checkboxes or buttons
        btns = page.locator("button, [role='checkbox'], input[type='checkbox']").all()
        print(f"Found {len(btns)} buttons/checkboxes")

        # Try clicking "Compare" buttons
        compare_btns = page.locator("button:has-text('Compare')").all()
        print(f"Found {len(compare_btns)} Compare buttons")
        for i, btn in enumerate(compare_btns[:2]):
            try:
                btn.click(timeout=2000)
                page.wait_for_timeout(500)
                print(f"Clicked compare btn {i}")
            except Exception as e:
                print(f"  skip: {e}")

        page.wait_for_timeout(1500)
        out = os.path.join(IMG, "compare_bar.png")
        page.screenshot(path=out)
        size = os.path.getsize(out)
        print(f"OK  compare_bar.png ({size//1024} KB)")
    except Exception as e:
        print(f"ERR: {e}")

    browser.close()
print("Done.")
