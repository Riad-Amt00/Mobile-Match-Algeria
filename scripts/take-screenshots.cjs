'use strict';
/**
 * Takes fresh light-mode English screenshots of Mobile Match Algeria for the mémoire.
 * Run: node scripts/take-screenshots.cjs
 * Dev server must be running on http://localhost:3000
 */
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '../memoire/images');
const ADMIN_EMAIL = 'admin@mobilematch.dz';
const ADMIN_PASS  = 'admin123456';

// Init script injected before EVERY page load in a context:
// sets theme=light and lang=en in localStorage before React reads them
const INIT_SCRIPT = `
  localStorage.setItem('theme', 'light');
  localStorage.setItem('lang', 'en');
  document.documentElement.setAttribute('data-theme', 'light');
`;

async function newLightCtx(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: 'light',
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(INIT_SCRIPT);
  return ctx;
}

async function forceLight(page) {
  // Belt-and-suspenders: also set after navigation in case hydration overwrites
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('lang', 'en');
    document.documentElement.setAttribute('data-theme', 'light');
  });
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  Saved ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const db = new Database('./prisma/dev.db');

  try {
    // ── 1. Home page ──────────────────────────────────────────────────────────
    console.log('Taking: screenshot_home');
    {
      const ctx = await newLightCtx(browser);
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(800);
      await shot(page, 'screenshot_home');
      await ctx.close();
    }

    // ── 2. Offers page ────────────────────────────────────────────────────────
    console.log('Taking: screenshot_offers');
    {
      const ctx = await newLightCtx(browser);
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/offers`, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(1500);
      await shot(page, 'screenshot_offers');
      await ctx.close();
    }

    // ── 3. Compare bar (offers page with 2 plans selected) ───────────────────
    console.log('Taking: compare_bar');
    {
      const ctx = await newLightCtx(browser);
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/offers`, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(1500);
      // Click the first two "Compare" buttons on offer cards
      const btns = await page.locator('button:has-text("Compare")').all();
      console.log(`  Found ${btns.length} Compare buttons`);
      if (btns.length >= 2) {
        await btns[0].click(); await page.waitForTimeout(500);
        await btns[1].click(); await page.waitForTimeout(700);
      }
      await shot(page, 'compare_bar');
      await ctx.close();
    }

    // ── 4. Login page ─────────────────────────────────────────────────────────
    console.log('Taking: screenshot_login');
    {
      const ctx = await newLightCtx(browser);
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(800);
      await shot(page, 'screenshot_login');
      await ctx.close();
    }

    // ── 5. Admin login ─────────────────────────────────────────────────────────
    console.log('Logging in as admin...');
    const authCtx = await newLightCtx(browser);
    {
      const page = await authCtx.newPage();
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(800);
      await page.fill('#login-email', ADMIN_EMAIL);
      await page.fill('#login-password', ADMIN_PASS);
      await page.waitForTimeout(300);
      await page.click('#login-submit');
      await page.waitForURL(url => !url.includes('/login') && !url.includes('/error'), { timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
      console.log(`  URL after login: ${page.url()}`);
      await page.close();
    }

    // ── 6. Recommendations page ───────────────────────────────────────────────
    console.log('Taking: screenshot_recommend');
    {
      const page = await authCtx.newPage();
      await page.goto(`${BASE_URL}/recommend`, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(1200);
      await shot(page, 'screenshot_recommend');
      await page.close();
    }

    // ── 7. Compare page with 3 real offer IDs ────────────────────────────────
    console.log('Taking: screenshot_compare');
    {
      const offers = db.prepare("SELECT id FROM Offer WHERE isActive = 1 LIMIT 3").all();
      const ids = offers.map(o => o.id).join(',');
      const page = await authCtx.newPage();
      await page.goto(`${BASE_URL}/compare?ids=${ids}`, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(2000);
      await shot(page, 'screenshot_compare');
      await page.close();
    }

    // ── 8. Admin dashboard ────────────────────────────────────────────────────
    console.log('Taking: screenshot_admin');
    {
      const page = await authCtx.newPage();
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
      await forceLight(page);
      await page.waitForTimeout(2000);
      await shot(page, 'screenshot_admin');
      await page.close();
    }

    await authCtx.close();
    console.log('\nAll screenshots done.');

  } finally {
    await browser.close();
    db.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
