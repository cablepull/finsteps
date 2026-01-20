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
  
  console.log('\nWaiting 5 seconds for module to load...');
  await page.waitForTimeout(5000);
  
  // Check what actually executed
  console.log('\n=== CHECKING WHAT EXECUTED ===');
  const executionCheck = await page.evaluate(() => {
    return {
      windowJsonEditor: typeof window.jsonEditor !== 'undefined',
      windowMpdEditor: typeof window.mpdEditor !== 'undefined',
      windowInitializeEditors: typeof window.initializeEditors !== 'undefined',
      windowMermaidInput: typeof window.mermaidInput !== 'undefined',
      windowCodeMirror: typeof CodeMirror !== 'undefined',
      documentReady: document.readyState,
      jsonEditorElement: !!document.getElementById('json-editor'),
      mpdEditorElement: !!document.getElementById('mpd-editor'),
      jsonCodeMirror: !!(document.getElementById('json-editor')?.querySelector('.CodeMirror')),
      mpdCodeMirror: !!(document.getElementById('mpd-editor')?.querySelector('.CodeMirror')),
    };
  });
  console.log('Execution check:', JSON.stringify(executionCheck, null, 2));
  
  // Try to manually call initializeEditors if it exists
  console.log('\n=== ATTEMPTING MANUAL INITIALIZATION ===');
  const manualInit = await page.evaluate(() => {
    try {
      // Check if initializeEditors function exists globally
      if (typeof initializeEditors === 'function') {
        console.log('initializeEditors function exists, calling it...');
        initializeEditors();
        return { success: true, message: 'Called initializeEditors' };
      } else {
        // Try to access it from the module
        // Check if there's a way to access it
        return { success: false, message: 'initializeEditors not accessible' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  console.log('Manual init result:', JSON.stringify(manualInit, null, 2));
  
  // Wait a bit and check again
  console.log('\nWaiting 2 seconds after manual init...');
  await page.waitForTimeout(2000);
  
  const afterManualInit = await page.evaluate(() => {
    return {
      jsonCodeMirror: !!(document.getElementById('json-editor')?.querySelector('.CodeMirror')),
      mpdCodeMirror: !!(document.getElementById('mpd-editor')?.querySelector('.CodeMirror')),
      windowJsonEditor: typeof window.jsonEditor !== 'undefined',
      windowMpdEditor: typeof window.mpdEditor !== 'undefined',
    };
  });
  console.log('After manual init:', JSON.stringify(afterManualInit, null, 2));
  
  // Check console messages
  console.log('\n=== CONSOLE MESSAGES ===');
  const editorLogs = allMessages.filter(m => m.text.includes('[EDITOR.JS]') || m.text.includes('[DEBUG]'));
  console.log(`Found ${editorLogs.length} editor-related console messages:`);
  editorLogs.forEach((msg, i) => {
    console.log(`${i+1}. [${msg.type}] ${msg.text}`);
  });
  
  // Check for errors
  const errors = allMessages.filter(m => m.type === 'error');
  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach((msg, i) => {
      console.log(`${i+1}. ${msg.text}`);
    });
  }
  
  if (pageErrors.length > 0) {
    console.log('\n=== PAGE ERRORS ===');
    pageErrors.forEach((err, i) => {
      console.log(`${i+1}. ${err.name}: ${err.message}`);
      if (err.stack) {
        const relevant = err.stack.split('\n').slice(0, 5).join('\n');
        console.log(`   Stack: ${relevant}`);
      }
    });
  }
  
  // Screenshot
  await page.screenshot({ path: 'debug/editor-debug-state.png', fullPage: true });
  console.log('\nScreenshot saved to debug/editor-debug-state.png');
  
  // Wait for manual inspection
  console.log('\nWaiting 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('\n[TEST ERROR]', error);
  console.error('Stack:', error.stack);
} finally {
  await browser.close();
}
