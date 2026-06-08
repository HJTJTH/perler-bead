/**
 * Watch & Learn: screenshot every 3s → MIMO analysis → learn the flow
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIMO_API = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_KEY = 'sk-c93g7yul3mslqfd4twgmlb40xnesjszbezqwazl8n0bngh9c';
const SCREENSHOT_PS1 = 'C:\\claudecode\\take-screenshot.ps1';
const SHOTS_DIR = 'C:\\claudecode\\shots';
const INTERVAL_MS = 3000;

let shotCount = 0;
const learnings = [];
let prevDescription = '';

function takeScreenshot() {
  const filepath = path.join(SHOTS_DIR, `shot_${String(shotCount).padStart(3, '0')}.png`);
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${SCREENSHOT_PS1}"`, { timeout: 10000 });
    const desktopShot = 'C:\\Users\\Administrator\\Desktop\\screenshot.png';
    if (fs.existsSync(desktopShot)) {
      if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
      fs.copyFileSync(desktopShot, filepath);
      try { fs.unlinkSync(desktopShot); } catch {}
      return filepath;
    }
  } catch (err) {
    console.log(`  Screenshot error: ${err.message}`);
  }
  return null;
}

async function analyzeWithMIMO(filepath, stepNum) {
  const base64 = fs.readFileSync(filepath).toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  const prevContext = prevDescription
    ? `Previous step description: ${prevDescription}`
    : 'This is the first screenshot.';

  const body = {
    model: 'mimo-v2.5',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUri } },
        {
          type: 'text',
          text: `This is a screenshot of a Windows desktop. The user is demonstrating how to create a new folder on 115.com netdisk.

${prevContext}

Describe EXACTLY what you see:
1. What page/dialog is visible?
2. What UI elements (buttons, menus, inputs) are on screen?
3. What likely just happened (what was clicked)?
4. What should be clicked next?

Keep it brief and actionable. Step ${stepNum}.`
        }
      ]
    }],
    max_completion_tokens: 500,
    temperature: 0.1
  };

  const res = await fetch(MIMO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': MIMO_KEY },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`MIMO error ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function run() {
  console.log('=== Watch & Learn Mode ===');
  console.log('Screenshot every 3s, sending to MIMO...');
  console.log('大王，开始演示吧！\n');

  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

  for (let i = 0; i < 15; i++) {
    shotCount++;
    console.log(`\n[${String(shotCount).padStart(2, '0')}] Capturing...`);

    const filepath = takeScreenshot();
    if (!filepath) {
      console.log('  Failed, retrying...');
      await new Promise(r => setTimeout(r, INTERVAL_MS));
      continue;
    }

    console.log(`  Saved: ${path.basename(filepath)}`);

    try {
      const analysis = await analyzeWithMIMO(filepath, shotCount);
      console.log(`  MIMO: ${analysis.slice(0, 450)}`);
      prevDescription = analysis;
      learnings.push({ step: shotCount, analysis });
    } catch (err) {
      console.log(`  MIMO error: ${err.message}`);
    }

    if (i < 14) {
      process.stdout.write(`  Next shot in ${INTERVAL_MS/1000}s...`);
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
  }

  // Print summary
  console.log('\n\n===== LEARNED FLOW =====');
  for (const l of learnings) {
    console.log(`\nStep ${l.step}:`);
    console.log(`  ${l.analysis.slice(0, 250)}`);
  }

  // Cleanup
  console.log('\nCleaning up screenshots...');
  for (const l of learnings) {
    try { fs.unlinkSync(path.join(SHOTS_DIR, `shot_${String(l.step).padStart(3, '0')}.png`)); } catch {}
  }
  try { fs.rmdirSync(SHOTS_DIR); } catch {}
  console.log('Done!');
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
