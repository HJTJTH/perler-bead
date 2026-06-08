/**
 * 115 Folder Creator - No MIMO needed, flow is learned
 * Flow: 新建 → 文件夹 → type name → 确定
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const CHROMIUM = 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
const USER_DATA = 'C:\\claudecode\\browser-profile';

// Human-like mouse move + click at coordinates
async function click(page, x, y) {
  const pos = await page.evaluate(() => ({ x: window._mx || 300, y: window._my || 200 }));
  for (let i = 1; i <= 8; i++) {
    const t = i / 8, ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(
      pos.x + (x - pos.x) * ease + (Math.random() - 0.5) * 6,
      pos.y + (y - pos.y) * ease + (Math.random() - 0.5) * 4
    );
    await page.waitForTimeout(12 + Math.random() * 20);
  }
  await page.mouse.click(x, y);
  await page.evaluate(({ mx, my }) => { window._mx = mx; window._my = my; }, { mx: x, my: y });
}

// Get center coordinates of an element
async function getCenter(el) {
  const box = await el.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Create a folder using the learned flow
async function createFolder(page, name) {
  console.log(`\n--- Creating: "${name}" ---`);

  // Step 1: Click "新建" button
  console.log('  [1/3] Click 新建...');
  const newBtn = await page.$('button:has-text("新建"), span:has-text("新建")');
  if (!newBtn) throw new Error('新建 not found');
  const nb = await getCenter(newBtn);
  await click(page, nb.x, nb.y);
  console.log(`       clicked (${nb.x.toFixed(0)}, ${nb.y.toFixed(0)})`);
  await page.waitForTimeout(1500);

  // Step 2: Click "文件夹" in dropdown
  console.log('  [2/3] Click 文件夹...');
  const folderBtn = await page.$('li:has-text("文件夹"), div:has-text("文件夹")');
  if (!folderBtn) throw new Error('文件夹 not found in dropdown');
  const fb = await getCenter(folderBtn);
  await click(page, fb.x, fb.y);
  console.log(`       clicked (${fb.x.toFixed(0)}, ${fb.y.toFixed(0)})`);
  await page.waitForTimeout(1500);

  // Step 3: Type name and confirm
  console.log(`  [3/3] Type "${name}" → 确定...`);
  const input = await page.$('input:focus') || await page.$('input[type="text"]');
  if (input) {
    await input.fill(name);
    console.log(`       typed "${name}"`);
  }
  await page.waitForTimeout(400);

  const okBtn = await page.$('button:has-text("确定"), button:has-text("创建"), span:has-text("确定")');
  if (okBtn) {
    const ob = await getCenter(okBtn);
    await click(page, ob.x, ob.y);
    console.log(`       clicked 确定`);
  } else {
    await page.keyboard.press('Enter');
    console.log('       pressed Enter');
  }
  await page.waitForTimeout(2500);
  console.log(`  ✓ "${name}" done`);
}

// Navigate into a folder
async function enterFolder(page, name) {
  console.log(`\n--- Entering: "${name}" ---`);
  // Refresh to see newly created folder
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Try multiple selectors
  let folderEl = await page.$(`a:has-text("${name}")`)
    || await page.$(`span:has-text("${name}")`)
    || await page.$(`div:has-text("${name}")`);

  if (!folderEl) {
    // Debug: dump visible text containing the name
    const matches = await page.$$eval('*', els =>
      els.filter(el => (el.textContent || '').includes(name) && el.offsetParent !== null)
        .map(el => ({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 60) }))
    );
    console.log('  Debug matches:', JSON.stringify(matches.slice(0, 10)));
    throw new Error(`Folder "${name}" not found`);
  }
  const fe = await getCenter(folderEl);
  // Double click to enter
  await click(page, fe.x, fe.y);
  await page.waitForTimeout(300);
  await click(page, fe.x, fe.y);
  console.log(`       double-clicked (${fe.x.toFixed(0)}, ${fe.y.toFixed(0)})`);
  await page.waitForTimeout(3000);
  console.log(`  ✓ Entered "${name}"`);
}

(async () => {
  console.log('=== 115 Folder Creator ===\n');

  const context = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: CHROMIUM,
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    viewport: { width: 1366, height: 768 }
  });

  const page = context.pages()[0] || await context.newPage();
  await page.evaluate(() => { window._mx = 300; window._my = 200; });

  // Go to netdisk
  await page.goto('https://115.com/storage/netdisk', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page:', await page.title());
  await page.waitForTimeout(2000);

  // Execute: create top → enter top → create 2015
  await createFolder(page, 'top');
  await enterFolder(page, 'top');
  await createFolder(page, '2015');

  console.log('\n=== ALL DONE ===');
  console.log('  root/top/');
  console.log('  root/top/2015/');
  process.exit(0);
})().catch(err => { console.error('Error:', err.message); process.exit(1); });
