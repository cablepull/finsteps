import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture ALL console messages including from module
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error' || text.includes('DEBUG') || text.includes('Error') || text.includes('Failed')) {
    console.log(`[${type}] ${text}`);
  }
});

page.on('pageerror', error => {
  console.error(`\n[PAGE ERROR] ${error.message}`);
  console.error(error.stack.split('\n').slice(0, 10).join('\n'));
});

// Capture failed network requests
page.on('requestfailed', request => {
  const url = request.url();
  if (url.includes('editor.js') || url.includes('index.js') || url.includes('visual-builder')) {
    console.error(`\n[NETWORK ERROR] ${url}`);
    console.error(`  Failure: ${request.failure()?.errorText}`);
  }
});

try {
  console.log('Navigating...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait and check console
  console.log('\nWaiting 5 seconds for module to load...');
  await page.waitForTimeout(5000);
  
  // Check if module executed by looking for CodeMirror elements
  const result = await page.evaluate(() => {
    return {
      jsonCM: !!document.querySelector('#json-editor .CodeMirror'),
      mpdCM: !!document.querySelector('#mpd-editor .CodeMirror'),
      hasError: !!document.querySelector('.error-message.show'),
      consoleLogs: [], // Can't capture past logs
    };
  });
  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('\n[TEST ERROR]', error);
} finally {
  await browser.close();
}
