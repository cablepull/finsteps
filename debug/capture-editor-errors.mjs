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

// Capture page errors with stack traces
const pageErrors = [];
page.on('pageerror', error => {
  pageErrors.push({
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  console.error(`\n[PAGE ERROR] ${error.name}: ${error.message}`);
  if (error.stack) {
    const lines = error.stack.split('\n');
    console.error('Stack trace:');
    lines.slice(0, 15).forEach(line => console.error(`  ${line}`));
  }
});

// Capture unhandled promise rejections
page.on('requestfailed', request => {
  const url = request.url();
  const failure = request.failure();
  if (url.includes('editor.js') || url.includes('index.js') || url.includes('visual-builder') || url.includes('mermaid') || url.includes('codemirror')) {
    console.error(`\n[NETWORK ERROR] ${url}`);
    console.error(`  Failure: ${failure?.errorText || 'Unknown'}`);
  }
});

// Monitor evaluation errors
let evalErrors = [];

try {
  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/examples/editor/', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  
  console.log('\nWaiting 10 seconds for full initialization...');
  await page.waitForTimeout(10000);
  
  // Try to evaluate the module to see if there are errors
  console.log('\n=== TESTING MODULE EVALUATION ===');
  try {
    const moduleResult = await page.evaluate(() => {
      // Try to access window properties
      return {
        hasJsonEditor: typeof window.jsonEditor !== 'undefined',
        hasMpdEditor: typeof window.mpdEditor !== 'undefined',
        hasCodeMirror: typeof CodeMirror !== 'undefined',
        hasMermaid: typeof mermaid !== 'undefined',
        documentReady: document.readyState,
        scripts: Array.from(document.querySelectorAll('script[type="module"]')).map(s => ({
          src: s.src || 'inline',
          loaded: s.src ? 'loaded' : 'inline'
        })),
      };
    });
    console.log('Module evaluation result:', JSON.stringify(moduleResult, null, 2));
  } catch (e) {
    console.error('Error evaluating module:', e.message);
    evalErrors.push(e);
  }
  
  // Check for CodeMirror instances in DOM
  console.log('\n// Check for CodeMirror instances and rendering
  console.log('\n=== CHECKING EDITOR RENDERING ===');
  const editorCheck = await page.evaluate(() => {
    const jsonEl = document.getElementById('json-editor');
    const mpdEl = document.getElementById('mpd-editor');
    const mermaidEl = document.getElementById('mermaid-container');
    
    return {
      jsonEditorElement: !!jsonEl,
      mpdEditorElement: !!mpdEl,
      mermaidContainer: !!mermaidEl,
      jsonCodeMirror: !!(jsonEl?.querySelector('.CodeMirror')),
      mpdCodeMirror: !!(mpdEl?.querySelector('.CodeMirror')),
      jsonCMHeight: jsonEl?.querySelector('.CodeMirror')?.offsetHeight || 0,
      mpdCMHeight: mpdEl?.querySelector('.CodeMirror')?.offsetHeight || 0,
      jsonCMVisible: !!(jsonEl?.querySelector('.CodeMirror') && window.getComputedStyle(jsonEl?.querySelector('.CodeMirror')).display !== 'none'),
      mermaidVisible: !!(mermaidEl && window.getComputedStyle(mermaidEl).display !== 'none'),
      activeTab: document.querySelector('.tab-btn.active')?.dataset?.tab || 'none',
      initializeEditorsCalled: typeof window.__initializeEditorsCalled !== 'undefined',
    };
  });
  console.log('Editor rendering check:', JSON.stringify(editorCheck, null, 2));
  
=== CHECKING DOM ===');
  const domCheck = await page.evaluate(() => {
    const jsonEl = document.getElementById('json-editor');
    const mpdEl = document.getElementById('mpd-editor');
    return {
      jsonEditorElement: !!jsonEl,
      mpdEditorElement: !!mpdEl,
      jsonCodeMirror: !!(jsonEl?.querySelector('.CodeMirror')),
      mpdCodeMirror: !!(mpdEl?.querySelector('.CodeMirror')),
      jsonCMHeight: jsonEl?.querySelector('.CodeMirror')?.offsetHeight || 0,
      mpdCMHeight: mpdEl?.querySelector('.CodeMirror')?.offsetHeight || 0,
    };
  });
  console.log('DOM check:', JSON.stringify(domCheck, null, 2));
  
  // Try to manually trigger initialization
  console.log('\n=== TESTING MANUAL INITIALIZATION ===');
  try {
    const initResult = await page.evaluate(() => {
      // Check if initializeEditors function exists
      const scripts = document.querySelectorAll('script[type="module"]');
      return {
        moduleScripts: scripts.length,
        moduleSrcs: Array.from(scripts).map(s => s.src).filter(Boolean),
      };
    });
    console.log('Init test:', JSON.stringify(initResult, null, 2));
  } catch (e) {
    console.error('Error testing initialization:', e.message);
    evalErrors.push(e);
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total console messages: ${allMessages.length}`);
  console.log(`Total page errors: ${pageErrors.length}`);
  console.log(`Total eval errors: ${evalErrors.length}`);
  
  if (pageErrors.length > 0) {
    console.log('\n=== PAGE ERRORS DETAIL ===');
    pageErrors.forEach((err, i) => {
      console.log(`\nError ${i + 1}:`);
      console.log(`  Name: ${err.name}`);
      console.log(`  Message: ${err.message}`);
      if (err.stack) {
        const relevantLines = err.stack.split('\n').filter(line => 
          line.includes('editor.js') || line.includes('at') || line.includes('Error')
        ).slice(0, 10);
        console.log(`  Stack (relevant):`);
        relevantLines.forEach(line => console.log(`    ${line}`));
      }
    });
  }
  
  // Filter console messages for errors and warnings
  const errors = allMessages.filter(m => m.type === 'error');
  const warnings = allMessages.filter(m => m.type === 'warning');
  
  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.text}`);
      if (msg.location) {
        console.log(`   Location: ${msg.location.url}:${msg.location.lineNumber}`);
      }
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n=== CONSOLE WARNINGS ===');
    warnings.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.text}`);
    });
  }
  
  // Screenshot
  await page.screenshot({ path: 'debug/editor-errors.png', fullPage: true });
  console.log('\nScreenshot saved to debug/editor-errors.png');
  
  // Wait for manual inspection
  console.log('\nWaiting 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
} catch (error) {
  console.error('\n[TEST ERROR]', error);
  console.error('Stack:', error.stack);
} finally {
  await browser.close();
}
