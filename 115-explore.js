const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const CHROMIUM = 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
const USER_DATA = 'C:\\claudecode\\browser-profile';

(async () => {
  const context = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: CHROMIUM,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ],
    viewport: { width: 1366, height: 768 }
  });

  const page = context.pages()[0] || await context.newPage();

  // Navigate to 115.com
  await page.goto('https://115.com', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page loaded:', await page.title());
  console.log('WebDriver:', await page.evaluate(() => navigator.webdriver));

  // Step 1: Click "115生活" link/button
  console.log('\n--- Looking for "115生活" ---');
  const lifeBtn = await page.$('a:has-text("115生活"), span:has-text("115生活"), div:has-text("115生活"), button:has-text("115生活")');
  if (lifeBtn) {
    console.log('Found 115生活 button, clicking...');
    await lifeBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    console.log('After click URL:', page.url());
    console.log('Title:', await page.title());
  } else {
    console.log('115生活 not found directly, dumping page links...');
    const links = await page.$$eval('a', els => els.slice(0, 50).map(el => ({
      href: el.href?.slice(0, 120),
      text: el.textContent?.trim().slice(0, 60)
    })));
    links.forEach(l => console.log(`  ${l.text} -> ${l.href}`));
  }

  // Step 2: Find and dump all buttons/links on current page
  console.log('\n--- Page buttons/clickable elements ---');
  const clickables = await page.$$eval('button, a, [role="button"], span[class*="btn"], div[class*="btn"]', els =>
    els.filter(el => el.offsetParent !== null).slice(0, 40).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 80),
      class: el.className?.slice(0, 60),
      id: el.id,
      href: el.href?.slice(0, 100)
    }))
  );
  clickables.forEach((c, i) => {
    const info = [c.tag, c.text, c.class, c.id, c.href].filter(Boolean).join(' | ');
    console.log(`[${i}] ${info}`);
  });

  // Screenshot
  await page.screenshot({ path: 'C:\\claudecode\\115-page.png' });
  console.log('\nScreenshot: C:\\claudecode\\115-page.png');
  console.log('Browser open - close manually.');
})();
