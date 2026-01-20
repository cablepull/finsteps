import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', error => console.error(`[ERROR] ${error.message}`));

try {
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const check = await page.evaluate(() => {
    const jsonEl = document.getElementById('json-editor');
    const mpdEl = document.getElementById('mpd-editor');
    const jsonCM = jsonEl?.querySelector('.CodeMirror');
    const mpdCM = mpdEl?.querySelector('.CodeMirror');
    
    return {
      jsonEditorElement: !!jsonEl,
      mpdEditorElement: !!mpdEl,
      jsonCodeMirror: !!jsonCM,
      mpdCodeMirror: !!mpdCM,
      jsonCMHeight: jsonCM?.offsetHeight || 0,
      mpdCMHeight: mpdCM?.offsetHeight || 0,
      jsonCMVisible: jsonCM && window.getComputedStyle(jsonCM).display !== 'none',
      mpdCMVisible: mpdCM && window.getComputedStyle(mpdCM).display !== 'none',
      jsonTabActive: document.querySelector('[data-tab="json"]')?.classList.contains('active'),
      mpdTabActive: document.querySelector('[data-tab="mpd"]')?.classList.contains('active'),
      jsonTabVisible: window.getComputedStyle(document.getElementById('json-tab')).display !== 'none',
      mpdTabVisible: window.getComputedStyle(document.getElementById('mpd-tab')).display !== 'none',
      windowJsonEditor: typeof window.jsonEditor !== 'undefined',
      windowMpdEditor: typeof window.mpdEditor !== 'undefined',
    };
  });
  
  console.log('\n=== EDITOR VISIBILITY CHECK ===');
  console.log(JSON.stringify(check, null, 2));
  
  // Try clicking on JSON tab
  console.log('\n=== CLICKING JSON TAB ===');
  await page.click('[data-tab="json"]');
  await page.waitForTimeout(500);
  
  const afterClick = await page.evaluate(() => {
    const jsonCM = document.getElementById('json-editor')?.querySelector('.CodeMirror');
    return {
      jsonTabActive: document.querySelector('[data-tab="json"]')?.classList.contains('active'),
      jsonCodeMirror: !!jsonCM,
      jsonCMHeight: jsonCM?.offsetHeight || 0,
      jsonCMVisible: jsonCM && window.getComputedStyle(jsonCM).display !== 'none',
    };
  });
  console.log('After clicking JSON tab:', JSON.stringify(afterClick, null, 2));
  
  await page.screenshot({ path: 'debug/editor-visibility-check.png', fullPage: true });
  console.log('\nScreenshot saved to debug/editor-visibility-check.png');
  
  await page.waitForTimeout(5000);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
