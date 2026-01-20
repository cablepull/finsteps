import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture all console messages
page.on('console', msg => {
  console.log(`[Console ${msg.type()}] ${msg.text()}`);
});

// Capture page errors
page.on('pageerror', error => {
  console.error(`[Page Error] ${error.message}`);
  if (error.stack) {
    console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  }
});

// Capture network errors
const networkErrors = [];
page.on('requestfailed', request => {
  const url = request.url();
  if (url.includes('editor.js') || url.includes('index.js') || url.includes('visual-builder')) {
    networkErrors.push({ url, failure: request.failure()?.errorText });
    console.error(`[Network Error] ${url}: ${request.failure()?.errorText}`);
  }
});

try {
  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for scripts
  await page.waitForTimeout(5000);
  
  // Check if module loaded by trying to evaluate
  console.log('\n=== TESTING MODULE LOAD ===');
  try {
    const result = await page.evaluate(() => {
      return {
        hasInitializeEditors: typeof window.initializeEditors !== 'undefined',
        hasInitJSONEditor: typeof window.initJSONEditor !== 'undefined',
        hasInitMPDEditor: typeof window.initMPDEditor !== 'undefined',
        hasSetupButtonListeners: typeof window.setupButtonListeners !== 'undefined',
        documentReady: document.readyState,
        scripts: Array.from(document.querySelectorAll('script')).map(s => ({
          src: s.src || 'inline',
          type: s.type,
          loaded: s.src ? 'loaded' : 'inline'
        })),
      };
    });
    console.log('Module state:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error checking module:', e.message);
  }
  
  // Check for syntax errors by trying to import
  console.log('\n=== CHECKING FOR SYNTAX ERRORS ===');
  const syntaxCheck = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
    return scripts.map(s => ({
      src: s.src || 'inline',
      hasError: s.onerror !== null
    }));
  });
  console.log('Module scripts:', JSON.stringify(syntaxCheck, null, 2));
  
  // Wait for manual inspection
  console.log('\nWaiting 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
} finally {
  await browser.close();
}
