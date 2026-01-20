import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture all console messages
const consoleMessages = [];
page.on('console', msg => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
  console.log(`[Console ${msg.type()}] ${msg.text()}`);
});

// Capture page errors
const pageErrors = [];
page.on('pageerror', error => {
  pageErrors.push({ message: error.message, stack: error.stack });
  console.error(`[Page Error] ${error.message}`);
});

try {
  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for scripts to load
  await page.waitForTimeout(5000);
  
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach((msg, i) => console.log(`${i+1}. [${msg.type}] ${msg.text}`));
  
  console.log('\n=== PAGE ERRORS ===');
  pageErrors.forEach((err, i) => {
    console.log(`${i+1}. ${err.message}`);
    if (err.stack) console.log(`   ${err.stack.split('\n')[1]?.trim()}`);
  });
  
  // Check if module loaded
  const moduleLoaded = await page.evaluate(() => {
    return {
      hasJsonEditor: typeof window.jsonEditor !== 'undefined',
      hasMpdEditor: typeof window.mpdEditor !== 'undefined',
      hasCodeMirror: typeof CodeMirror !== 'undefined',
      hasMermaid: typeof mermaid !== 'undefined',
      scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent?.substring(0, 50)),
    };
  });
  
  console.log('\n=== MODULE LOAD STATE ===');
  console.log(JSON.stringify(moduleLoaded, null, 2));
  
  // Check network failures
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText });
  });
  
  if (failedRequests.length > 0) {
    console.log('\n=== FAILED REQUESTS ===');
    failedRequests.forEach((req, i) => console.log(`${i+1}. ${req.url}: ${req.failure}`));
  }
  
  // Wait for manual inspection
  console.log('\nWaiting 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
