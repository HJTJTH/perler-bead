/**
 * MIMO Vision + Playwright Control
 * Desktop screenshot → MIMO vision API → Execute mouse actions → Clean up screenshots
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

const MIMO_API = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_KEY = 'sk-c93g7yul3mslqfd4twgmlb40xnesjszbezqwazl8n0bngh9c';

const CHROMIUM = 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
const USER_DATA = 'C:\\claudecode\\browser-profile';
const SCREENSHOT_PATH = 'C:\\claudecode\\vision-screenshot.png';
const RESULT_PATH = 'C:\\claudecode\\vision-result.png';

// --------------- MIMO Vision API ---------------
async function analyzeScreen(imagePath, instruction) {
  const base64 = fs.readFileSync(imagePath).toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  const body = {
    model: 'mimo-v2.5',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUri } },
        {
          type: 'text',
          text: `You are controlling a Windows desktop browser. This is a screenshot of the 115.com netdisk page.

TASK: ${instruction}

Return ONLY a JSON object (no markdown, no other text):
{
  "description": "what you see",
  "actions": [
    {"type": "click", "target": "what to click", "x": pixelX, "y": pixelY},
    {"type": "type", "text": "text to type"},
    {"type": "press", "key": "Enter"},
    {"type": "wait", "ms": 1000}
  ],
  "done": false,
  "next_step": "what next"
}
Set done:true when complete. Coordinates MUST be exact pixel positions from the screenshot.`
        }
      ]
    }],
    max_completion_tokens: 1024,
    temperature: 0.1
  };

  console.log('  Analyzing screenshot with MIMO...');
  const res = await fetch(MIMO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': MIMO_KEY },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MIMO API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const reply = data.choices[0].message.content;
  console.log('  MIMO reply:', reply.slice(0, 300));

  // Extract JSON from reply
  const jsonMatch = reply.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { description: reply, actions: [], done: true };
  try { return JSON.parse(jsonMatch[0]); } catch { return { description: reply, actions: [], done: true }; }
}

// --------------- Cleanup ---------------
function cleanupScreenshots() {
  for (const f of [SCREENSHOT_PATH, RESULT_PATH]) {
    try { if (fs.existsSync(f)) { fs.unlinkSync(f); console.log(`  Deleted: ${f}`); } } catch {}
  }
}

// --------------- Human-like mouse ---------------
async function humanClick(page, x, y) {
  const pos = await page.evaluate(() => ({ x: window._mx || 300, y: window._my || 200 }));
  const steps = 6 + Math.floor(Math.random() * 6);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const cx = pos.x + (x - pos.x) * ease + (Math.random() - 0.5) * 5;
    const cy = pos.y + (y - pos.y) * ease + (Math.random() - 0.5) * 3;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(12 + Math.random() * 20);
  }
  await page.mouse.move(x, y);
  await page.waitForTimeout(60 + Math.random() * 100);
  await page.mouse.click(x, y);
  await page.evaluate(({ mx, my }) => { window._mx = mx; window._my = my; }, { mx: x, my: y });
  console.log(`  Clicked (${Math.round(x)}, ${Math.round(y)})`);
}

async function humanType(page, text) {
  for (const char of text) {
    await page.keyboard.type(char, { delay: 40 + Math.random() * 100 });
  }
  console.log(`  Typed: "${text}"`);
}

async function executeActions(page, actions) {
  for (const a of actions) {
    switch (a.type) {
      case 'click': await humanClick(page, a.x, a.y); break;
      case 'type': await humanType(page, a.text); break;
      case 'press': await page.keyboard.press(a.key); console.log(`  Pressed: ${a.key}`); break;
      case 'wait': await page.waitForTimeout(a.ms || 1000); break;
    }
    await page.waitForTimeout(300);
  }
}

// --------------- Main ---------------
async function main() {
  const task = process.argv[2] || '在115网盘创建一个叫top的文件夹';

  console.log('=== MIMO Vision Control ===');
  console.log('Task:', task, '\n');

  // Launch browser
  console.log('Launching stealth browser...');
  const context = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: CHROMIUM,
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    viewport: { width: 1366, height: 768 }
  });

  const page = context.pages()[0] || await context.newPage();
  await page.evaluate(() => { window._mx = 300; window._my = 200; });

  // Go to 115
  console.log('Navigating to 115 netdisk...');
  await page.goto('https://115.com/storage/netdisk', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page:', await page.title());
  await page.waitForTimeout(2000);

  // Vision loop
  for (let step = 1; step <= 8; step++) {
    console.log(`\n--- Step ${step}/8 ---`);

    await page.screenshot({ path: SCREENSHOT_PATH });
    console.log('  Screenshot captured');

    let result;
    try {
      result = await analyzeScreen(SCREENSHOT_PATH, `Step ${step}. ${task}. What should I do next? Be precise about pixel coordinates.`);
    } catch (err) {
      console.error('  MIMO error:', err.message);
      break;
    }

    console.log('  Description:', result.description);

    if (result.done) {
      console.log('\n=== TASK COMPLETE ===');
      break;
    }

    if (!result.actions?.length) {
      console.log('  No actions, stopping.');
      break;
    }

    console.log(`  Executing ${result.actions.length} actions...`);
    await executeActions(page, result.actions);
    if (result.next_step) console.log('  Next:', result.next_step);
    await page.waitForTimeout(800);

    // Delete intermediate screenshot after each step
    try { fs.unlinkSync(SCREENSHOT_PATH); } catch {}
  }

  // Final screenshot + cleanup
  await page.screenshot({ path: RESULT_PATH });
  console.log('\nResult screenshot saved briefly');
  cleanupScreenshots();
  console.log('All screenshots cleaned up. Browser stays open.');
}

main().catch(err => { console.error('Fatal:', err); cleanupScreenshots(); process.exit(1); });
