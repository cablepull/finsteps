import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture ALL console messages
const allMessages = [];
page.on('console', msg => {
  allMessages.push({ type: msg.type(), text: msg.text() });
  if (msg.type() !== 'log' || msg.text().includes('DEBUG') || msg.text().includes('EDITOR') || msg.text().includes('Error') || msg.text().includes('error')) {
    console.log(`[${msg.type()}] ${msg.text()}`);
  }
});

// Capture page errors
page.on('pageerror', error => {
  console.error(`\n[PAGE ERROR] ${error.message}`);
  if (error.stack) {
    console.error(error.stack.split('\n').slice(0, 10).join('\n'));
  }
});

try {
  console.log('Navigating...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for everything
  console.log('\nWaiting 8 seconds for initialization...');
  await page.waitForTimeout(8000);
  
  // Check for CodeMirror instances
  const result = await page.evaluate(() => {
    return {
      jsonCM: !!document.querySelector('#json-editor .CodeMirror'),
      mpdCM: !!document.querySelector('#mpd-editor .CodeMirror'),
      allConsoleLogs: [], // Can't capture past logs
    };
  });
  
  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  
  console.log(`\n=== ALL CONSOLE MESSAGES (${allMessages.length}) ===`);
  allMessages.forEach((msg, i) => {
    if (msg.type === 'error' || msg.text.includes('DEBUG') || msg.text.includes('EDITOR')) {
      console.log(`${i+1}. [${msg.type}] ${msg.text}`);
    }
  });
  
  await page.waitForTimeout(5000);
  
} catch (error) {
  console.error('\n[TEST ERROR]', error);
} finally {
  await browser.close();
}
