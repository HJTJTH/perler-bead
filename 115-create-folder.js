const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const CHROMIUM = 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
const USER_DATA = 'C:\\claudecode\\browser-profile';

// Human-like mouse move with slight curve
async function humanClick(page, x, y) {
  // Move mouse in small steps to simulate human movement
  const currentPos = await page.evaluate(() => ({ x: window.mouseX || 300, y: window.mouseY || 200 }));
  const steps = 8 + Math.floor(Math.random() * 8);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Ease-in-out curve
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const cx = currentPos.x + (x - currentPos.x) * ease + (Math.random() - 0.5) * 6;
    const cy = currentPos.y + (y - currentPos.y) * ease + (Math.random() - 0.5) * 4;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(15 + Math.random() * 25);
  }
  await page.mouse.move(x, y);
  await page.waitForTimeout(80 + Math.random() * 120);
  await page.mouse.click(x, y);
  // Track position
  await page.evaluate(({ mx, my }) => { window.mouseX = mx; window.mouseY = my; }, { mx: x, my: y });
}

async function humanType(page, text) {
  for (const char of text) {
    await page.keyboard.type(char, { delay: 60 + Math.random() * 120 });
  }
}

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

  // Init mouse tracking
  await page.evaluate(() => { window.mouseX = 300; window.mouseY = 200; });

  console.log('Navigating to 115 netdisk...');
  await page.goto('https://115.com/storage/netdisk', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page:', await page.title());
  console.log('URL:', page.url());
  await page.waitForTimeout(1500);

  // === Step 1: Move mouse to "新建" button and click ===
  console.log('\n[1/4] Finding "新建" button position...');
  const newBtnBox = await page.$eval('button:has-text("新建")', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  }).catch(() => null);

  if (!newBtnBox) {
    console.log('ERROR: 新建 button not found');
    await page.screenshot({ path: 'C:\\claudecode\\115-debug.png' });
    return;
  }

  console.log(`  新建 at (${Math.round(newBtnBox.x)}, ${Math.round(newBtnBox.y)})`);
  await humanClick(page, newBtnBox.x, newBtnBox.y);
  console.log('  Clicked 新建');
  await page.waitForTimeout(2000);

  // === Step 2: Move mouse to "文件夹" in dropdown ===
  console.log('\n[2/4] Finding "文件夹" in dropdown...');
  // The dropdown appears after clicking 新建, look for the item
  const allDivs = await page.$$eval('*', els => {
    return els
      .filter(el => {
        const t = (el.textContent || '').trim();
        return (t === '文件夹' || t === '新建文件夹') && el.offsetParent !== null;
      })
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 40),
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
          w: r.width,
          h: r.height,
          class: el.className?.slice(0, 60)
        };
      });
  });

  console.log('  Candidates:', JSON.stringify(allDivs, null, 2));

  // Pick the one that looks like a dropdown item (narrower, clickable area)
  const folderItem = allDivs.find(d => d.text === '文件夹' && d.w < 600);
  if (!folderItem) {
    console.log('ERROR: 文件夹 option not found in dropdown');
    await page.screenshot({ path: 'C:\\claudecode\\115-debug2.png' });
    return;
  }

  console.log(`  文件夹 at (${Math.round(folderItem.x)}, ${Math.round(folderItem.y)})`);
  await humanClick(page, folderItem.x, folderItem.y);
  console.log('  Clicked 文件夹');
  await page.waitForTimeout(2000);

  // === Step 3: Type folder name ===
  console.log('\n[3/4] Looking for folder name input...');
  const inputBox = await page.$$eval('input:not([type="hidden"])', els => {
    return els
      .filter(el => el.offsetParent !== null)
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          type: el.type,
          placeholder: el.placeholder,
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
          w: r.width,
          h: r.height,
          class: el.className?.slice(0, 60)
        };
      });
  });

  console.log('  Inputs:', JSON.stringify(inputBox, null, 2));

  const nameInput = inputBox.find(i => i.w > 100 && i.w < 800);
  if (!nameInput) {
    console.log('ERROR: No suitable input found');
    await page.screenshot({ path: 'C:\\claudecode\\115-debug3.png' });
    return;
  }

  console.log(`  Input at (${Math.round(nameInput.x)}, ${Math.round(nameInput.y)})`);
  await humanClick(page, nameInput.x, nameInput.y);
  await page.waitForTimeout(500);

  // Clear existing and type
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  console.log('  Typing "top"...');
  await humanType(page, 'top');
  await page.waitForTimeout(500);

  // === Step 4: Click confirm ===
  console.log('\n[4/4] Finding confirm button...');
  const confirmBox = await page.$$eval('button, [role="button"]', els => {
    return els
      .filter(el => {
        const t = (el.textContent || '').trim();
        return (t === '确定' || t === '创建' || t === '确认') && el.offsetParent !== null;
      })
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          text: el.textContent?.trim(),
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
          w: r.width,
          h: r.height
        };
      });
  });

  console.log('  Confirm buttons:', JSON.stringify(confirmBox, null, 2));

  const confirm = confirmBox[0];
  if (confirm) {
    console.log(`  Confirm at (${Math.round(confirm.x)}, ${Math.round(confirm.y)})`);
    await humanClick(page, confirm.x, confirm.y);
    console.log('  Clicked confirm!');
  } else {
    console.log('  No confirm button, pressing Enter...');
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:\\claudecode\\115-result.png' });
  console.log('\n=== DONE! Folder "top" should be created ===');
  console.log('Screenshot: C:\\claudecode\\115-result.png');
  console.log('Browser stays open for you to verify.');
})();
