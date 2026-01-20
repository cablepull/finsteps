import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture ALL console messages
const allMessages = [];
page.on('console', msg => {
  const text = msg.text();
  const type = msg.type();
  allMessages.push({ type, text, location: msg.location() });
  console.log(`[${type}] ${text}`);
});

// Capture page errors
const pageErrors = [];
page.on('pageerror', error => {
  pageErrors.push({
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  console.error(`\n[PAGE ERROR] ${error.name}: ${error.message}`);
});

try {
  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/examples/editor/', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  
  console.log('\nWaiting 5 seconds for initialization...');
  await page.waitForTimeout(5000);
  
  // Check for rendering
  console.log('\n=== CHECKING EDITOR RENDERING ===');
  const editorCheck = await page.evaluate(() => {
    const jsonEl = document.getElementById('json-editor');
    const mpdEl = document.getElementById('mpd-editor');
    const mermaidEl = document.getElementById('mermaid-container');
    const visualEl = document.getElementById('visual-tab');
    
    return {
      jsonEditorElement: !!jsonEl,
      mpdEditorElement: !!mpdEl,
      mermaidContainer: !!mermaidEl,
      visualTab: !!visualEl,
      jsonCodeMirror: !!(jsonEl?.querySelector('.CodeMirror')),
      mpdCodeMirror: !!(mpdEl?.querySelector('.CodeMirror')),
      jsonCMHeight: jsonEl?.querySelector('.CodeMirror')?.offsetHeight || 0,
      mpdCMHeight: mpdEl?.querySelector('.CodeMirror')?.offsetHeight || 0,
      jsonCMVisible: !!(jsonEl?.querySelector('.CodeMirror') && window.getComputedStyle(jsonEl?.querySelector('.CodeMirror')).display !== 'none'),
      mpdCMVisible: !!(mpdEl?.querySelector('.CodeMirror') && window.getComputedStyle(mpdEl?.querySelector('.CodeMirror')).display !== 'none'),
      mermaidVisible: !!(mermaidEl && window.getComputedStyle(mermaidEl).display !== 'none'),
      activeTab: document.querySelector('.tab-btn.active')?.dataset?.tab || 'none',
      allTabs: Array.from(document.querySelectorAll('.tab-btn')).map(b => ({ id: b.dataset.tab, active: b.classList.contains('active') })),
      windowJsonEditor: typeof window.jsonEditor !== 'undefined',
      windowMpdEditor: typeof window.mpdEditor !== 'undefined',
      windowCodeMirror: typeof CodeMirror !== 'undefined',
      documentReady: document.readyState,
    };
  });
  console.log('Editor rendering check:', JSON.stringify(editorCheck, null, 2));
  
  // Filter console messages
  const errors = allMessages.filter(m => m.type === 'error');
  const logs = allMessages.filter(m => m.type === 'log');
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total console messages: ${allMessages.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Logs: ${logs.length}`);
  
  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.text}`);
    });
  }
  
  // Check initialization logs
  const initLogs = logs.filter(m => m.text.includes('initialization') || m.text.includes('initializeEditors') || m.text.includes('checkpoint'));
  if (initLogs.length > 0) {
    console.log('\n=== INITIALIZATION LOGS ===');
    initLogs.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.text}`);
    });
  }
  
  // Screenshot
  await page.screenshot({ path: 'debug/editor-rendering.png', fullPage: true });
  console.log('\nScreenshot saved to debug/editor-rendering.png');
  
  // Wait for manual inspection
  console.log('\nWaiting 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('\n[TEST ERROR]', error);
} finally {
  await browser.close();
}
