import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Enable console logging
page.on('console', msg => console.log(`[Console] ${msg.text()}`));
page.on('pageerror', error => console.error(`[Page Error] ${error.message}\n${error.stack}`));

try {
  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/examples/editor/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  console.log('\n=== PAGE STATE INSPECTION ===\n');
  
  // Check for console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Check network errors
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText
    });
  });
  
  // Check page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check if key elements exist
  const checks = {
    'Mermaid input': await page.$('#mermaid-input'),
    'JSON editor element': await page.$('#json-editor'),
    'MPD editor element': await page.$('#mpd-editor'),
    'Visual builder': await page.$('#visual-builder'),
    'Mermaid pane': await page.$('#mermaid-pane'),
    'DSL pane': await page.$('#dsl-pane'),
    'Preview panel': await page.$('.preview-panel'),
    'Generate DSL button': await page.$('#generate-dsl'),
    'Mermaid pane toggle': await page.$('#mermaid-pane-toggle'),
    'DSL pane toggle': await page.$('#dsl-pane-toggle'),
  };
  
  console.log('\n=== ELEMENT EXISTENCE ===');
  for (const [name, element] of Object.entries(checks)) {
    console.log(`${name}: ${element ? 'EXISTS' : 'MISSING'}`);
  }
  
  // Check element visibility
  console.log('\n=== ELEMENT VISIBILITY ===');
  const visibilityChecks = {};
  for (const [name, element] of Object.entries(checks)) {
    if (element) {
      const isVisible = await element.isVisible();
      const display = await page.evaluate((el) => {
        return window.getComputedStyle(el).display;
      }, element);
      visibilityChecks[name] = { visible: isVisible, display };
      console.log(`${name}: visible=${isVisible}, display=${display}`);
    }
  }
  
  // Check JavaScript variables
  console.log('\n=== JAVASCRIPT STATE ===');
  const jsState = await page.evaluate(() => {
    return {
      jsonEditorExists: typeof window.jsonEditor !== 'undefined' && window.jsonEditor !== null,
      mpdEditorExists: typeof window.mpdEditor !== 'undefined' && window.mpdEditor !== null,
      CodeMirrorExists: typeof CodeMirror !== 'undefined',
      mermaidExists: typeof mermaid !== 'undefined',
      documentReady: document.readyState,
    };
  });
  console.log('JSON:', JSON.stringify(jsState, null, 2));
  
  // Check CodeMirror instances
  if (jsState.CodeMirrorExists) {
    console.log('\n=== CODEMIRROR INSTANCES ===');
    const cmInstances = await page.evaluate(() => {
      const jsonEl = document.getElementById('json-editor');
      const mpdEl = document.getElementById('mpd-editor');
      return {
        jsonEditor: jsonEl && jsonEl.querySelector('.CodeMirror') ? 'EXISTS' : 'MISSING',
        mpdEditor: mpdEl && mpdEl.querySelector('.CodeMirror') ? 'EXISTS' : 'MISSING',
        jsonEditorValue: window.jsonEditor ? window.jsonEditor.getValue().substring(0, 50) : 'NULL',
        mpdEditorValue: window.mpdEditor ? window.mpdEditor.getValue().substring(0, 50) : 'NULL',
      };
    });
    console.log('CodeMirror:', JSON.stringify(cmInstances, null, 2));
  }
  
  // Check CSS loading
  console.log('\n=== CSS FILES ===');
  const cssFiles = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    return links.map(link => ({
      href: link.href,
      loaded: link.sheet !== null,
    }));
  });
  console.log('CSS files:', JSON.stringify(cssFiles, null, 2));
  
  // Check tab state
  console.log('\n=== TAB STATE ===');
  const tabState = await page.evaluate(() => {
    const jsonTab = document.getElementById('json-tab');
    const mpdTab = document.getElementById('mpd-tab');
    const visualTab = document.getElementById('visual-tab');
    return {
      jsonTabActive: jsonTab?.classList.contains('active'),
      mpdTabActive: mpdTab?.classList.contains('active'),
      visualTabActive: visualTab?.classList.contains('active'),
      jsonTabDisplay: jsonTab ? window.getComputedStyle(jsonTab).display : 'none',
      mpdTabDisplay: mpdTab ? window.getComputedStyle(mpdTab).display : 'none',
      visualTabDisplay: visualTab ? window.getComputedStyle(visualTab).display : 'none',
    };
  });
  console.log('Tab state:', JSON.stringify(tabState, null, 2));
  
  // Check pane state
  console.log('\n=== PANE STATE ===');
  const paneState = await page.evaluate(() => {
    const mermaidPane = document.getElementById('mermaid-pane');
    const dslPane = document.getElementById('dsl-pane');
    return {
      mermaidPaneExists: !!mermaidPane,
      dslPaneExists: !!dslPane,
      mermaidPaneCollapsed: mermaidPane?.classList.contains('collapsed'),
      dslPaneCollapsed: dslPane?.classList.contains('collapsed'),
      mermaidPaneDisplay: mermaidPane ? window.getComputedStyle(mermaidPane).display : 'none',
      dslPaneDisplay: dslPane ? window.getComputedStyle(dslPane).display : 'none',
    };
  });
  console.log('Pane state:', JSON.stringify(paneState, null, 2));
  
  // Check layout classes
  console.log('\n=== LAYOUT CLASSES ===');
  const layoutClasses = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    const main = document.querySelector('main');
    return {
      asideClass: aside?.className,
      mainClass: main?.className,
      leftPanels: !!document.querySelector('.left-panels'),
      inputPanel: !!document.querySelector('.input-panel'),
      inputPanes: document.querySelectorAll('.input-pane').length,
    };
  });
  console.log('Layout classes:', JSON.stringify(layoutClasses, null, 2));
  
  // Check for errors
  if (consoleErrors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach((err, i) => console.log(`${i+1}. ${err}`));
  }
  
  if (failedRequests.length > 0) {
    console.log('\n=== FAILED REQUESTS ===');
    failedRequests.forEach((req, i) => console.log(`${i+1}. ${req.url}: ${req.failure}`));
  }
  
  // Take a screenshot
  await page.screenshot({ path: 'debug/editor-state.png', fullPage: true });
  console.log('\n=== SCREENSHOT SAVED ===');
  console.log('Saved to: debug/editor-state.png');
  
  // Wait for manual inspection
  console.log('\nWaiting 15 seconds for manual inspection...');
  await page.waitForTimeout(15000);
  
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
} finally {
  await browser.close();
}
