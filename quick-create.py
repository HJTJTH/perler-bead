"""
Fast 115 folder creator using browser-use CDP connection.
Connects to running browser-use daemon, creates folders with minimal latency.
Usage: python quick-create.py <folder1> [folder2] [folder3...]
"""
import sys, json, time, asyncio
from browser_use import Browser

async def eval_js(browser, js_code):
    """Execute JS in browser and return parsed result"""
    page = await browser.get_current_page()
    result = await page.evaluate(js_code)
    return result

async def click_coord(browser, x, y):
    """Click at coordinates"""
    page = await browser.get_current_page()
    await page.mouse.click(x, y)

async def type_text(browser, text):
    """Type text into focused element"""
    page = await browser.get_current_page()
    await page.keyboard.type(text, delay=30)

async def create_folder(browser, name):
    """Create a folder using JS injection for reliability + speed"""
    page = await browser.get_current_page()

    # Step 1: Click 新建 via JS (reliable)
    await page.evaluate("""
        [...document.querySelectorAll('button')]
        .find(b => b.textContent.trim() === '新建')
        ?.click()
    """)
    await asyncio.sleep(0.6)

    # Step 2: Click 文件夹 in dropdown via JS
    await page.evaluate("""
        [...document.querySelectorAll('*')]
        .find(el => ['新建文件夹','文件夹'].includes(el.textContent.trim())
             && el.offsetParent && el.getBoundingClientRect().top > 100)
        ?.click()
    """)
    await asyncio.sleep(0.6)

    # Step 3: Type folder name
    inp = await page.query_selector('#folder-name')
    if inp:
        await inp.fill(name)
    else:
        await page.keyboard.type(name, delay=30)

    await asyncio.sleep(0.3)

    # Step 4: Click 确定
    await page.evaluate("""
        [...document.querySelectorAll('button')]
        .find(b => b.textContent.trim() === '确定' && !b.disabled)
        ?.click()
    """)
    await asyncio.sleep(1.5)
    print(f'  Created: {name}')

async def enter_folder(browser, name):
    """Navigate into a folder by name"""
    page = await browser.get_current_page()

    # Find and double-click folder
    coords = await page.evaluate(f"""
        const el = document.querySelector('[title="{name}"]');
        if (el) {{
            const r = el.getBoundingClientRect();
            return {{x: r.x + r.width/2, y: r.y + r.height/2}};
        }}
        return null;
    """)

    if coords:
        await page.mouse.click(coords['x'], coords['y'])
        await asyncio.sleep(0.2)
        await page.mouse.click(coords['x'], coords['y'])
        await asyncio.sleep(1.5)
        print(f'  Entered: {name}')
        return True

    print(f'  Folder "{name}" not found!')
    return False

async def main():
    if len(sys.argv) < 2:
        print("Usage: python quick-create.py <folder1> [folder2] ...")
        sys.exit(1)

    names = sys.argv[1:]
    print(f'Creating folders: {names}')

    # Connect to existing browser-use daemon via CDP
    browser = Browser(cdp_url='http://127.0.0.1:19200')
    await browser.start()
    page = await browser.get_current_page()

    # Ensure we're at netdisk root
    current_url = await page.evaluate('window.location.href')
    if 'storage' not in current_url:
        await page.goto('https://115.com/storage/netdisk', wait_until='networkidle')
        await asyncio.sleep(1.5)

    print(f'Page: {await page.evaluate("document.title")}')

    # Create first folder at root
    await create_folder(browser, names[0])

    # For each subsequent folder, enter previous and create new
    for i in range(1, len(names)):
        # Go back to root first, then enter each parent
        await page.goto('https://115.com/storage/netdisk', wait_until='networkidle')
        await asyncio.sleep(1.5)

        # Navigate through folder chain
        for j in range(i):
            if not await enter_folder(browser, names[j]):
                print(f'Failed to enter {names[j]}')
                return

        await create_folder(browser, names[i])

    await browser.close()
    print(f'\nDone! Created: {" > ".join(names)}')

if __name__ == '__main__':
    asyncio.run(main())
