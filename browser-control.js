const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const CHROMIUM = 'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
const USER_DATA = 'C:\\claudecode\\browser-profile';

(async () => {
  const args = process.argv.slice(2);
  const url = args[0] || 'https://www.baidu.com';
  const action = args[1] || 'stay';
  const useProxy = process.argv.includes('--proxy');

  console.log(`URL: ${url} | Proxy: ${useProxy ? 'ON' : 'OFF'} | Stealth: ON`);

  // Persistent context = cookies + logins survive between sessions
  const context = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: CHROMIUM,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      ...(useProxy ? ['--proxy-server=socks5://127.0.0.1:1081'] : [])
    ],
    viewport: { width: 1366, height: 768 }
  });

  const page = context.pages()[0] || await context.newPage();

  if (action === 'stay') {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    console.log(`WebDriver: ${await page.evaluate(() => navigator.webdriver)}`);
    console.log('Browser open - close manually, logins saved');
  } else if (action === '115-folder') {
    // Navigate to 115 file list
    await page.goto('https://115.com', { waitUntil: 'load', timeout: 60000 });
    const folderName = args[2] || 'tpop250';
    console.log(`Creating folder: ${folderName}`);

    // Click "新建文件夹" button
    const newFolderBtn = await page.$('text=新建文件夹');
    if (!newFolderBtn) {
      // Try alternative selectors
      const altBtn = await page.$('[title="新建文件夹"]') || await page.$('.btn-add-folder');
      if (altBtn) await altBtn.click();
      else console.log('Could not find new-folder button - looking for it...');
    } else {
      await newFolderBtn.click();
    }
    await page.waitForTimeout(1000);

    // Type folder name
    const input = await page.$('input[type="text"]') || await page.$('.folder-name-input');
    if (input) {
      await input.fill(folderName);
      await page.keyboard.press('Enter');
      console.log(`Folder "${folderName}" created!`);
    }
    console.log('Check browser - close manually');
  } else if (action === 'screenshot') {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    const sp = args[2] || 'C:\\Users\\Administrator\\Desktop\\browser-screenshot.png';
    await page.screenshot({ path: sp, fullPage: true });
    console.log(`Screenshot: ${sp}`);
    await context.close();
  }
})();
