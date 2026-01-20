import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture console messages
page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', error => {
  console.error(`[ERROR] ${error.message}`);
  console.error(error.stack.split('\n').slice(0, 3).join('\n'));
});

try {
  console.log('Navigating...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait longer for initialization
  await page.waitForTimeout(5000);
  
  console.log('\n=== CHECKING EDITORS ===');
  const editors = await page.evaluate(() => {
    const jsonEl = document.getElementById('json-editor');
    const mpdEl = document.getElementById('mpd-editor');
    const jsonCM = jsonEl?.querySelector('.CodeMirror');
    const mpdCM = mpdEl?.querySelector('.CodeMirror');
    
    return {
      jsonEditorElement: !!jsonEl,
      mpdEditorElement: !!mpdEl,
      jsonCodeMirror: !!jsonCM,
      mpdCodeMirror: !!mpdCM,
      jsonCMVisible: jsonCM ? window.getComputedStyle(jsonCM).display !== 'none' : false,
      mpdCMVisible: mpdCM ? window.getComputedStyle(mpdCM).display !== 'none' : false,
      jsonCMHeight: jsonCM ? jsonCM.offsetHeight : 0,
      mpdCMHeight: mpdCM ? mpdCM.offsetHeight : 0,
    };
  });
  console.log(JSON.stringify(editors, null, 2));
  
  console.log('\n=== TESTING INITIALIZATION ===');
  // Try to trigger initialization manually
  const initResult = await page.evaluate(() => {
    // Check if functions exist in module scope (won't work, but let's see)
    const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
    return {
      moduleScripts: scripts.length,
      moduleSrcs: scripts.map(s => s.src).filter(Boolean),
    };
  });
  console.log(JSON.stringify(initResult, null, 2));
  
  // Screenshot
  await page.screenshot({ path: 'debug/editor-final-state.png', fullPage: true });
  console.log('\nScreenshot saved to debug/editor-final-state.png');
  
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
