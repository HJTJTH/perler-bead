/**
 * Quick Watch: 1 shot/sec, 20 total
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIMO_API = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_KEY = 'sk-c93g7yul3mslqfd4twgmlb40xnesjszbezqwazl8n0bngh9c';
const DIR = 'C:\\claudecode\\shots';
const TOTAL = 20;
const INTERVAL = 1000;

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const learnings = [];

function capture(n) {
  const fp = path.join(DIR, `s${String(n).padStart(2, '0')}.png`);
  try {
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -File "C:\\claudecode\\take-screenshot.ps1"', { timeout: 10000 });
    const src = 'C:\\Users\\Administrator\\Desktop\\screenshot.png';
    if (fs.existsSync(src)) { fs.copyFileSync(src, fp); try { fs.unlinkSync(src); } catch {} return fp; }
  } catch {}
  return null;
}

async function analyze(fp, n, prev) {
  const b64 = fs.readFileSync(fp).toString('base64');
  const body = {
    model: 'mimo-v2.5',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        { type: 'text', text: `Screenshot ${n}/${TOTAL}. User creating folder on 115.com. ${prev ? `Prev step: ${prev}` : ''} What page/dialog? What just clicked? What next? Short.` }
      ]
    }],
    max_completion_tokens: 300,
    temperature: 0.1
  };
  const res = await fetch(MIMO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': MIMO_KEY },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`MIMO ${res.status}`);
  return (await res.json()).choices[0].message.content;
}

(async () => {
  console.log('=== Quick Watch: 1/sec, 20 shots ===');
  console.log('大王开始吧！\n');

  let prev = '';
  for (let i = 1; i <= TOTAL; i++) {
    console.log(`[${String(i).padStart(2, '0')}]`);
    const fp = capture(i);
    if (!fp) { console.log('  fail'); continue; }

    try {
      const a = await analyze(fp, i, prev);
      console.log(`  ${a.slice(0, 300)}`);
      prev = a;
      learnings.push({ step: i, analysis: a });
    } catch (err) {
      console.log(`  err: ${err.message}`);
    }

    if (i < TOTAL) await new Promise(r => setTimeout(r, INTERVAL));
  }

  console.log('\n===== FLOW =====');
  learnings.forEach(l => console.log(`[${l.step}] ${l.analysis.slice(0, 200)}`));

  for (let i = 1; i <= TOTAL; i++) { try { fs.unlinkSync(path.join(DIR, `s${String(i).padStart(2, '0')}.png`)); } catch {} }
  try { fs.rmdirSync(DIR); } catch {}
  console.log('\nDone!');
})();
