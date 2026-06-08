/**
 * 115 Folder Creator v3 - One MIMO scan, then execute
 * Doesn't kill existing Chrome, connects to it
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

const MIMO_API = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_KEY = 'sk-c93g7yul3mslqfd4twgmlb40xnesjszbezqwazl8n0bngh9c';
const CHROMIUM = 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
const USER_DATA = 'C:\\claudecode\\browser-profile';

let page;

async function scanPage() {
  const shot = 'C:\\claudecode\\scan.png';
  await page.screenshot({ path: shot });
  const b64 = fs.readFileSync(shot).toString('base64');
  try { fs.unlinkSync(shot); } catch {}

  const body = {
    model: 'mimo-v2.5',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        { type: 'text',
          text: `115.com netdisk page. I need pixel coordinates (center) for:
1. "新建" button (top toolbar, usually with + icon)
2. "文件夹" option (dropdown below 新建, ~30-40px below at same X)
3. Text input in folder creation dialog (center of dialog)
4. "确定" button in same dialog (blue button, bottom-right of dialog)

Return ONLY: {"xinjian":{"x":N,"y":N},"folderOption":{"x":N,"y":N},"input":{"x":N,"y":N},"confirm":{"x":N,"y":N}}
For items not on screen, estimate reasonable positions.` }
      ]
    }],
    max_completion_tokens: 400,
    temperature: 0.1
  };
  const res = await fetch(MIMO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': MIMO_KEY },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`MIMO ${res.status}`);
  const reply = (await res.json()).choices[0].message.content;
  console.log('MIMO scan:', reply.slice(0, 350));
  const m = reply.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

async function click(x, y, label) {
  if (!x || !y || isNaN(x) || isNaN(y)) { console.log(`  BAD coords ${label}`); return; }
  console.log(`  Click ${label} (${Math.round(x)},${Math.round(y)})`);
  const pos = await page.evaluate(() => ({ x: window._mx || 400, y: window._my || 200 }));
  for (let i = 1; i <= 10; i++) {
    const t = i / 10, ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(
      pos.x + (x - pos.x) * ease + (Math.random() - 0.5) * 8,
      pos.y + (y - pos.y) * ease + (Math.random() - 0.5) * 5
    );
    await page.waitForTimeout(10 + Math.random() * 15);
  }
  await page.mouse.click(x, y);
  await page.evaluate(({ mx, my }) => { window._mx = mx; window._my = my; }, { mx: x, my: y });
}

async function createFolder(name) {
  console.log(`\n=== Creating "${name}" ===`);

  const pos = await scanPage();
  if (!pos?.xinjian) throw new Error('Cannot find 新建');

  // 1. Click 新建
  await click(pos.xinjian.x, pos.xinjian.y, '新建');
  await page.waitForTimeout(1500);

  // 2. Click 文件夹 (below 新建 in dropdown)
  const fy = (pos.folderOption?.x) ? pos.folderOption : { x: pos.xinjian.x, y: pos.xinjian.y + 130 };
  await click(fy.x, fy.y, '文件夹');
  await page.waitForTimeout(1500);

  // 3. Click input and type
  const inp = (pos.input?.x) ? pos.input : { x: 680, y: 380 };
  await click(inp.x, inp.y, 'input');
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  await page.keyboard.type(name, { delay: 60 });
  console.log(`  Typed "${name}"`);
  await page.waitForTimeout(400);

  // 4. Click 确定
  const cf = (pos.confirm?.x) ? pos.confirm : { x: 780, y: 480 };
  await click(cf.x, cf.y, '确定');
  await page.waitForTimeout(2500);
  console.log(`  Done: "${name}"`);
}

async function enterFolder(name) {
  console.log(`\n=== Entering "${name}" ===`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Find by text content
  const el = await page.$(`a:has-text("${name}")`)
    || await page.$(`span:has-text("${name}")`)
    || await page.$(`div:has-text("${name}")`);

  if (el) {
    const box = await el.boundingBox();
    await click(box.x + box.width / 2, box.y + box.height / 2, name);
    await page.waitForTimeout(300);
    await click(box.x + box.width / 2, box.y + box.height / 2, name);
  }
  await page.waitForTimeout(3000);
  console.log(`  Entered "${name}"`);
}

(async () => {
  console.log('=== 115 Folder Creator v3 ===\n');

  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: CHROMIUM,
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    viewport: { width: 1366, height: 768 }
  });
  page = ctx.pages()[0] || await ctx.newPage();
  await page.evaluate(() => { window._mx = 400; window._my = 200; });

  await page.goto('https://115.com/storage/netdisk', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page:', await page.title());
  await page.waitForTimeout(2000);

  await createFolder('top');
  await enterFolder('top');
  await createFolder('2015');

  console.log('\n=== DONE: root/top/2015 ===');
})().catch(err => { console.error('FATAL:', err.message); });
