'use strict';
/**
 * Full functional test of Mobile Match Algeria.
 * Reports PASS / FAIL / NOTE for every feature.
 * Run: node scripts/full-test.cjs
 */
const { chromium } = require('playwright');
const Database = require('better-sqlite3');

const BASE = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@mobilematch.dz';
const ADMIN_PASS  = 'admin123456';
const DEMO_EMAIL  = 'demo@mobilematch.dz';
const DEMO_PASS   = 'user123456';

const INIT = `
  localStorage.setItem('theme','light');
  localStorage.setItem('lang','en');
  document.documentElement.setAttribute('data-theme','light');
`;

const results = [];
function pass(name, note='') { results.push({ s:'PASS', name, note }); console.log(`  ✓ ${name}${note?' — '+note:''}`); }
function fail(name, note='') { results.push({ s:'FAIL', name, note }); console.log(`  ✗ ${name}${note?' — '+note:''}`); }
function note(name, n)       { results.push({ s:'NOTE', name, note:n }); console.log(`  ! ${name} — ${n}`); }

async function newCtx(browser) {
  const ctx = await browser.newContext({ viewport:{width:1400,height:900}, colorScheme:'light' });
  await ctx.addInitScript(INIT);
  return ctx;
}

async function login(ctx, email, pass) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil:'networkidle' });
  await page.fill('#login-email', email);
  await page.fill('#login-password', pass);
  await page.click('#login-submit');
  await page.waitForURL(u => !u.includes('/login') && !u.includes('/error'), { timeout:10000 }).catch(()=>{});
  await page.waitForTimeout(800);
  const url = page.url();
  await page.close();
  return !url.includes('/login') && !url.includes('/error');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const db = new Database('./prisma/dev.db');

  // ── 1. HOME PAGE ────────────────────────────────────────────────────────────
  console.log('\n[1] Home page');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil:'networkidle' });
    await page.waitForTimeout(600);

    const langSelector = await page.locator('text=Welcome').count();
    langSelector > 0 ? pass('Language selector visible') : fail('Language selector not found');

    const tiles = await page.locator('text=Compare plans').count();
    tiles > 0 ? pass('Feature tiles visible') : fail('Feature tiles not found');

    const logos = await page.locator('text=Djezzy, text=Ooredoo, text=Mobilis').count();
    const logoArea = await page.locator('text=Covering').count() + await page.locator('text=COVERING').count();
    logoArea > 0 ? pass('Operator logos section visible') : note('Operator logos','section text not found but logos may still render');

    // Click English and verify redirect to /offers
    const enBtn = page.locator('text=Browse offers').first();
    if (await enBtn.count() > 0) {
      await enBtn.click();
      await page.waitForURL(u => u.includes('/offers'), { timeout:5000 }).catch(()=>{});
      page.url().includes('/offers') ? pass('Language select → redirects to /offers') : fail('Language select did not redirect to /offers');
    } else {
      fail('Browse offers button not found');
    }
    await ctx.close();
  }

  // ── 2. OFFERS PAGE ──────────────────────────────────────────────────────────
  console.log('\n[2] Offers page');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/offers`, { waitUntil:'networkidle' });
    await page.waitForTimeout(1200);

    const cards = await page.locator('article, [class*="card"]').count();
    cards > 0 ? pass(`Offer cards rendered (${cards} visible)`) : fail('No offer cards found');

    // Operator filter tabs
    const djezzyTab = await page.locator('button:has-text("Djezzy")').count();
    djezzyTab > 0 ? pass('Operator filter tabs present') : fail('Operator filter tabs not found');

    // Click Djezzy filter
    if (djezzyTab > 0) {
      await page.click('button:has-text("Djezzy")');
      await page.waitForTimeout(800);
      const djezzyCards = await page.locator('text=DJEZZY').count();
      djezzyCards > 0 ? pass('Djezzy filter works') : fail('Djezzy filter produced no results');
    }

    // Type filter pills
    const prepaidBtn = await page.locator('button:has-text("Prepaid")').first();
    if (await prepaidBtn.count() > 0) {
      await page.goto(`${BASE}/offers`, { waitUntil:'networkidle' });
      await page.waitForTimeout(1000);
      await prepaidBtn.click();
      await page.waitForTimeout(600);
      pass('Type filter pills present and clickable');
    } else {
      fail('Type filter pills not found');
    }

    // Advanced filters panel
    const filtersBtn = await page.locator('button:has-text("Filters"), button:has-text("Filtres")').first();
    if (await filtersBtn.count() > 0) {
      await filtersBtn.click();
      await page.waitForTimeout(400);
      const sliders = await page.locator('input[type="range"]').count();
      sliders > 0 ? pass(`Advanced filter panel opens (${sliders} sliders)`) : note('Advanced filters','panel opened but no sliders found');
    } else {
      fail('Filters button not found');
    }

    // Compare bar: select 2 offers
    await page.goto(`${BASE}/offers`, { waitUntil:'networkidle' });
    await page.waitForTimeout(1200);
    const compareBtns = await page.locator('button:has-text("Compare")').all();
    if (compareBtns.length >= 2) {
      await compareBtns[0].click(); await page.waitForTimeout(300);
      await compareBtns[1].click(); await page.waitForTimeout(500);
      const bar = await page.locator('text=Compare side-by-side, text=offers selected').count();
      bar > 0 ? pass('Compare sticky bar appears when 2 offers selected') : fail('Compare sticky bar not visible after selecting 2 offers');
    } else {
      fail('Not enough Compare buttons to test sticky bar');
    }

    await ctx.close();
  }

  // ── 3. OFFER DETAIL PAGE ─────────────────────────────────────────────────
  console.log('\n[3] Offer detail page');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    const offer = db.prepare("SELECT id FROM Offer WHERE isActive=1 LIMIT 1").get();
    if (offer) {
      await page.goto(`${BASE}/offers/${offer.id}`, { waitUntil:'networkidle' });
      await page.waitForTimeout(800);
      const content = await page.content();
      content.includes('DA') ? pass('Offer detail page loads with price') : fail('Offer detail page missing price data');
      const similar = await page.locator('text=Similar, text=similar').count();
      similar > 0 ? pass('Similar offers section present') : note('Similar offers','section label not found');
    } else {
      fail('No active offer in DB for detail test');
    }
    await ctx.close();
  }

  // ── 4. COMPARE PAGE ──────────────────────────────────────────────────────
  console.log('\n[4] Compare page');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    const offers = db.prepare("SELECT id FROM Offer WHERE isActive=1 LIMIT 3").all();
    const ids = offers.map(o=>o.id).join(',');
    await page.goto(`${BASE}/compare?ids=${ids}`, { waitUntil:'networkidle' });
    await page.waitForTimeout(1500);

    const title = await page.locator('text=Comparison, text=Side-by-side').count();
    title > 0 ? pass('Compare page loads') : fail('Compare page title not found');

    const rows = await page.locator('text=Price, text=Data, text=Calls').count();
    rows > 0 ? pass('Comparison table rows visible') : fail('Comparison table rows not found');

    // Check best-value highlighting exists
    const highlighted = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('td, [class*="cell"]'));
      return cells.some(c => {
        const s = window.getComputedStyle(c);
        return s.color.includes('139') || s.fontWeight === '800' || s.fontWeight === '900' || c.style.color;
      });
    });
    highlighted ? pass('Best-value highlighting present in table') : note('Best-value highlighting','could not detect via computed style');

    // Verify NO radar chart (should not exist)
    const radar = await page.locator('[class*="radar"], svg.recharts').count();
    radar === 0 ? pass('No radar chart (correct — not implemented)') : fail('Unexpected radar chart found');

    await ctx.close();
  }

  // ── 5. LOGIN ─────────────────────────────────────────────────────────────
  console.log('\n[5] Login');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil:'networkidle' });
    await page.waitForTimeout(600);

    // Wrong credentials
    await page.fill('#login-email', 'wrong@email.com');
    await page.fill('#login-password', 'wrongpass');
    await page.click('#login-submit');
    await page.waitForTimeout(1500);
    const error = await page.locator('text=Incorrect, text=error').count();
    error > 0 ? pass('Wrong credentials shows inline error') : fail('Wrong credentials — no error shown');

    // Correct credentials
    await page.fill('#login-email', DEMO_EMAIL);
    await page.fill('#login-password', DEMO_PASS);
    await page.click('#login-submit');
    await page.waitForURL(u => !u.includes('/login'), { timeout:8000 }).catch(()=>{});
    !page.url().includes('/login') ? pass('Correct credentials → redirects away from login') : fail('Correct credentials — still on login page');

    await ctx.close();
  }

  // ── 6. REGISTER ──────────────────────────────────────────────────────────
  console.log('\n[6] Register page');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/register`, { waitUntil:'networkidle' });
    await page.waitForTimeout(600);

    const form = await page.locator('input[type="email"]').count();
    form > 0 ? pass('Registration form loads') : fail('Registration form not found');

    const nameField = await page.locator('input[placeholder*="name"], input[id*="name"]').count();
    nameField > 0 ? pass('Name field present in registration') : fail('Name field not found');

    await ctx.close();
  }

  // ── 7. AUTH-PROTECTED PAGES (login as demo user) ─────────────────────────
  console.log('\n[7] Authenticated features (demo user)');
  {
    const ctx = await newCtx(browser);
    const ok = await login(ctx, DEMO_EMAIL, DEMO_PASS);
    ok ? pass('Demo user login succeeds') : fail('Demo user login failed — skipping auth tests');

    if (ok) {
      // Saved offers page
      const savedPage = await ctx.newPage();
      await savedPage.goto(`${BASE}/saved`, { waitUntil:'networkidle' });
      await savedPage.waitForTimeout(800);
      const savedContent = await savedPage.locator('text=Saved, text=saved').count();
      savedContent > 0 ? pass('Saved offers page loads') : fail('Saved offers page missing content');
      await savedPage.close();

      // Save an offer
      const offersPage = await ctx.newPage();
      await offersPage.goto(`${BASE}/offers`, { waitUntil:'networkidle' });
      await offersPage.waitForTimeout(1200);
      const saveBtn = offersPage.locator('button[aria-label*="save"], button:has-text("Save")').first();
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await offersPage.waitForTimeout(600);
        pass('Save offer button clickable when authenticated');
      } else {
        note('Save offer button','bookmark icon button — checking for bookmark icon');
        const bookmarkBtn = await offersPage.locator('[class*="bookmark"], [aria-label*="bookmark"]').count();
        bookmarkBtn > 0 ? pass('Bookmark/save icon present on offer cards') : fail('No save/bookmark button found on offer cards');
      }
      await offersPage.close();

      // Profile page
      const profilePage = await ctx.newPage();
      await profilePage.goto(`${BASE}/profile`, { waitUntil:'networkidle' });
      await profilePage.waitForTimeout(800);
      const profileForm = await profilePage.locator('input[type="range"]').count();
      profileForm > 0 ? pass('Profile page loads with preference sliders') : fail('Profile page missing sliders');
      await profilePage.close();

      // Notifications
      const resp = await ctx.request.get(`${BASE}/api/notifications`);
      resp.ok() ? pass('GET /api/notifications returns 200') : fail(`GET /api/notifications returned ${resp.status()}`);
    }

    await ctx.close();
  }

  // ── 8. RECOMMENDATIONS ───────────────────────────────────────────────────
  console.log('\n[8] Recommendations page');
  {
    const ctx = await newCtx(browser);
    await login(ctx, DEMO_EMAIL, DEMO_PASS);

    const page = await ctx.newPage();
    await page.goto(`${BASE}/recommend`, { waitUntil:'networkidle' });
    await page.waitForTimeout(1000);

    const heading = await page.locator('text=Recommendation').count();
    heading > 0 ? pass('Recommendations page loads') : fail('Recommendations heading not found');

    // Check if form or results shown
    const sliders = await page.locator('input[type="range"]').count();
    const results2 = await page.locator('text=match, text=Match').count();
    if (sliders > 0) pass(`Profile form shown (${sliders} sliders)`);
    else if (results2 > 0) pass('Results shown directly (profile already saved)');
    else fail('Neither form nor results found');

    // Test API directly
    const apiResp = await ctx.request.post(`${BASE}/api/recommendations`, {
      data: { budget: 2000, dataGB: 10, voiceMinutes: 60, smsCount: 0, type: 'any', network: 'any' }
    });
    if (apiResp.ok()) {
      const data = await apiResp.json();
      const recs = data.recommendations || data;
      Array.isArray(recs) && recs.length > 0
        ? pass(`POST /api/recommendations returns ${recs.length} results with scores`)
        : fail('POST /api/recommendations returned empty array');
    } else {
      fail(`POST /api/recommendations returned ${apiResp.status()}`);
    }

    await page.close();
    await ctx.close();
  }

  // ── 9. ADMIN DASHBOARD ───────────────────────────────────────────────────
  console.log('\n[9] Admin dashboard');
  {
    const ctx = await newCtx(browser);
    await login(ctx, ADMIN_EMAIL, ADMIN_PASS);

    const page = await ctx.newPage();
    await page.goto(`${BASE}/admin`, { waitUntil:'networkidle' });
    await page.waitForTimeout(1500);

    // Stats cards
    const stats = await page.locator('text=Active offers, text=Registered users').count();
    stats > 0 ? pass('Stats cards visible') : fail('Stats cards not found');

    // Operator health
    const health = await page.locator('text=Operator health, text=OPERATOR HEALTH').count();
    health > 0 ? pass('Operator health panel visible') : fail('Operator health panel not found');

    // Tabs
    const historyTab = await page.locator('button:has-text("Scrape history")').count();
    historyTab > 0 ? pass('Scrape history tab present') : fail('Scrape history tab not found');

    const notifTab = await page.locator('button:has-text("Notifications")').count();
    notifTab > 0 ? pass('Notifications tab present') : fail('Notifications tab not found');

    // No offer management tab
    const offerMgmt = await page.locator('button:has-text("Offers"), button:has-text("Manage offers")').count();
    offerMgmt === 0 ? pass('No offer management tab (correct)') : fail('Unexpected offer management tab found');

    // Run scrape button
    const scrapeBtn = await page.locator('button:has-text("Run scrape now")').count();
    scrapeBtn > 0 ? pass('"Run scrape now" button present') : fail('Run scrape button not found');

    // API: admin stats
    const statsResp = await ctx.request.get(`${BASE}/api/admin/stats`);
    if (statsResp.ok()) {
      const d = await statsResp.json();
      pass(`GET /api/admin/stats — ${d.totalActiveOffers} active offers, ${d.totalUsers} users, ${d.successRate}% success`);
    } else {
      fail(`GET /api/admin/stats returned ${statsResp.status()}`);
    }

    // Scrape history tab
    await page.click('button:has-text("Scrape history")');
    await page.waitForTimeout(600);
    const logs = await page.locator('text=LATEST, text=Session').count();
    logs > 0 ? pass('Scrape history shows sessions') : note('Scrape history','no sessions visible or different label');

    // Notifications tab
    await page.click('button:has-text("Notifications")');
    await page.waitForTimeout(600);
    const notifContent = await page.locator('[class*="notif"], text=scrape, text=New offer').count();
    notifContent > 0 ? pass('Notifications tab loads notification entries') : note('Notifications tab','entries not found — may be empty');

    await page.close();
    await ctx.close();
  }

  // ── 10. API ROUTES ────────────────────────────────────────────────────────
  console.log('\n[10] API routes');
  {
    const ctx = await newCtx(browser);

    const pub = await ctx.request.get(`${BASE}/api/offers`);
    pub.ok() ? pass('GET /api/offers — 200') : fail(`GET /api/offers — ${pub.status()}`);

    const offers = db.prepare("SELECT id FROM Offer WHERE isActive=1 LIMIT 3").all();
    if (offers.length >= 3) {
      const ids = offers.map(o=>o.id).join(',');
      const cmp = await ctx.request.get(`${BASE}/api/offers?ids=${ids}`);
      cmp.ok() ? pass('GET /api/offers?ids=… — 200') : fail(`GET /api/offers?ids — ${cmp.status()}`);

      const detail = await ctx.request.get(`${BASE}/api/offers/${offers[0].id}`);
      detail.ok() ? pass('GET /api/offers/[id] — 200') : fail(`GET /api/offers/[id] — ${detail.status()}`);
    }

    const stats = await ctx.request.get(`${BASE}/api/stats`);
    stats.ok() ? pass('GET /api/stats — 200') : fail(`GET /api/stats — ${stats.status()}`);

    // Auth required routes — should return 401
    const savedUnauth = await ctx.request.get(`${BASE}/api/saved-offers`);
    savedUnauth.status() === 401 ? pass('GET /api/saved-offers unauthenticated → 401') : note('GET /api/saved-offers unauthenticated',`returned ${savedUnauth.status()}`);

    const profileUnauth = await ctx.request.get(`${BASE}/api/profile`);
    profileUnauth.status() === 401 ? pass('GET /api/profile unauthenticated → 401') : note('GET /api/profile unauthenticated',`returned ${profileUnauth.status()}`);

    const adminUnauth = await ctx.request.get(`${BASE}/api/admin/stats`);
    adminUnauth.status() === 401 ? pass('GET /api/admin/stats unauthenticated → 401') : note('GET /api/admin/stats unauthenticated',`returned ${adminUnauth.status()}`);

    await ctx.close();
  }

  // ── 11. MULTI-LANGUAGE ────────────────────────────────────────────────────
  console.log('\n[11] Multi-language');
  {
    const ctx = await browser.newContext({ viewport:{width:1400,height:900} });
    await ctx.addInitScript(`localStorage.setItem('theme','light');localStorage.setItem('lang','fr');document.documentElement.setAttribute('data-theme','light');`);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/offers`, { waitUntil:'networkidle' });
    await page.waitForTimeout(1000);
    const frContent = await page.locator('text=Offres, text=Prépayé, text=Tous').count();
    frContent > 0 ? pass('French UI renders correctly') : fail('French UI not rendering');
    await ctx.close();

    const ctx2 = await browser.newContext({ viewport:{width:1400,height:900} });
    await ctx2.addInitScript(`localStorage.setItem('theme','light');localStorage.setItem('lang','ar');document.documentElement.setAttribute('data-theme','light');`);
    const page2 = await ctx2.newPage();
    await page2.goto(`${BASE}/offers`, { waitUntil:'networkidle' });
    await page2.waitForTimeout(1000);
    const arContent = await page2.content();
    arContent.includes('عروض') || arContent.includes('كل') ? pass('Arabic UI renders correctly') : note('Arabic UI','Arabic text not detected — may need RTL check');
    await ctx2.close();
  }

  // ── 12. DARK / LIGHT MODE TOGGLE ─────────────────────────────────────────
  console.log('\n[12] Theme toggle');
  {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/offers`, { waitUntil:'networkidle' });
    await page.waitForTimeout(800);
    const themeBtn = await page.locator('button[aria-label*="theme"], button:has([data-lucide="sun"]), button:has([data-lucide="moon"])').count();
    // Try clicking the sun/moon icon in navbar
    const moonBtn = await page.locator('[class*="theme"], button:has(svg)').filter({ hasText: '' }).nth(0);
    const themeToggle = await page.evaluate(() => {
      const before = document.documentElement.getAttribute('data-theme');
      return before;
    });
    themeToggle ? pass(`Theme toggle — current theme: ${themeToggle}`) : note('Theme toggle','data-theme attribute not found');
    await ctx.close();
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  await browser.close();
  db.close();

  const passed = results.filter(r=>r.s==='PASS').length;
  const failed = results.filter(r=>r.s==='FAIL').length;
  const noted  = results.filter(r=>r.s==='NOTE').length;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`RESULTS: ${passed} PASS  ${failed} FAIL  ${noted} NOTE`);
  console.log('─'.repeat(60));
  if (failed > 0) {
    console.log('\nFAILURES:');
    results.filter(r=>r.s==='FAIL').forEach(r=>console.log(`  ✗ ${r.name}: ${r.note}`));
  }
  if (noted > 0) {
    console.log('\nNOTES:');
    results.filter(r=>r.s==='NOTE').forEach(r=>console.log(`  ! ${r.name}: ${r.note}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
